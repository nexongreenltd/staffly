import Bull from 'bull';
import { query, withTransaction } from '../db/db';
import { ZKTecoClient } from '../zkteco/zkteco.client';
import { logger } from '../utils/logger';
import { config } from '../config';

interface DeviceSyncJob {
  deviceId: string;
  companyId: string;
  priority?: boolean;
}

interface PushUserJob {
  companyId: string;
  employeeId: string;
}

interface DeleteUserJob {
  companyId: string;
  employeeId: string;
}

export class DeviceSyncWorker {
  private queue: Bull.Queue;

  constructor() {
    this.queue = new Bull('device-sync', {
      redis: config.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    this.registerProcessors();
    this.registerEvents();
  }

  private registerProcessors() {
    this.queue.process('sync-device', 5, async (job) => {
      const { deviceId, companyId } = job.data as DeviceSyncJob;
      await this.syncDevice(deviceId, companyId, job);
    });

    this.queue.process('push-user', 3, async (job) => {
      const { companyId, employeeId } = job.data as PushUserJob;
      await this.pushUserToDevices(companyId, employeeId);
    });

    this.queue.process('delete-user', 3, async (job) => {
      const { companyId, employeeId } = job.data as DeleteUserJob;
      await this.deleteUserFromDevices(companyId, employeeId);
    });
  }

  private registerEvents() {
    this.queue.on('completed', (job) => {
      logger.info(`Job completed`, { jobId: job.id, jobName: job.name });
    });

    this.queue.on('failed', (job, err) => {
      logger.error(`Job failed`, {
        jobId: job.id,
        jobName: job.name,
        attempt: job.attemptsMade,
        error: err.message,
      });
    });

    this.queue.on('stalled', (job) => {
      logger.warn(`Job stalled`, { jobId: job.id });
    });
  }

  // ─── Sync a single device ────────────────────────────────────────────────────

  private async syncDevice(deviceId: string, companyId: string, job: Bull.Job) {
    const [device] = await query(
      'SELECT * FROM devices WHERE id = $1 AND company_id = $2 AND is_enabled = true',
      [deviceId, companyId],
    );

    if (!device) {
      logger.warn('Device not found or disabled', { deviceId });
      return;
    }

    logger.info('Starting device sync', {
      deviceId,
      name: device.name,
      ip: device.ip_address,
    });

    const client = new ZKTecoClient({
      ip: device.ip_address,
      port: device.port,
      timeout: config.worker.deviceTimeoutMs,
    });

    try {
      await client.connect();
      await job.progress(10);

      // Disable device during sync to prevent new punches being missed
      await client.disableDevice();

      // Get attendance logs
      const logs = await client.getAttendanceLogs();
      await job.progress(50);

      logger.info(`Fetched ${logs.length} attendance records`, {
        deviceId,
        name: device.name,
      });

      // Store logs in DB
      const newLogs = await this.storeAttendanceLogs(logs, device, companyId);
      await job.progress(80);

      // Get device info
      const info = await client.getDeviceInfo();

      // Re-enable device
      await client.enableDevice();
      await client.disconnect();

      // Update device status
      await query(
        `UPDATE devices SET
          status = 'active',
          last_synced_at = NOW(),
          last_error = NULL,
          serial_number = COALESCE($2, serial_number),
          firmware_version = COALESCE($3, firmware_version)
        WHERE id = $1`,
        [deviceId, info.serialNumber || null, info.firmwareVersion || null],
      );

      await job.progress(100);

      logger.info('Device sync completed', {
        deviceId,
        name: device.name,
        newLogs,
      });

      return { newLogs };
    } catch (err) {
      logger.error('Device sync failed', {
        deviceId,
        name: device.name,
        error: err.message,
      });

      await query(
        `UPDATE devices SET status = 'error', last_error = $2 WHERE id = $1`,
        [deviceId, err.message],
      );

      // Try to enable device back even on error
      try { await client.enableDevice(); await client.disconnect(); } catch (_) {}

      throw err;
    }
  }

  private async storeAttendanceLogs(
    logs: any[],
    device: any,
    companyId: string,
  ): Promise<number> {
    if (logs.length === 0) return 0;

    // Build employee map from device_employee_map
    const mappings = await query(
      `SELECT device_user_id, employee_id FROM device_employee_map
       WHERE device_id = $1`,
      [device.id],
    );
    const uidToEmployee = new Map<number, string>();
    for (const m of mappings) {
      uidToEmployee.set(m.device_user_id, m.employee_id);
    }

    let inserted = 0;

    for (const log of logs) {
      const employeeId = uidToEmployee.get(log.uid) || null;

      try {
        await query(
          `INSERT INTO attendance_logs
            (company_id, device_id, employee_id, device_user_id, punch_time, punch_type, verify_type, raw_record)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (device_id, device_user_id, punch_time) DO NOTHING`,
          [
            companyId,
            device.id,
            employeeId,
            log.uid,
            log.attTime.toISOString(),
            log.inoutMode,
            log.verifyMode,
            JSON.stringify({ uid: log.uid, userId: log.userId }),
          ],
        );
        inserted++;
      } catch (err) {
        logger.warn('Failed to insert attendance log', {
          uid: log.uid,
          time: log.attTime,
          error: err.message,
        });
      }
    }

    return inserted;
  }

  // ─── Push employee to all company devices ───────────────────────────────────

  private async pushUserToDevices(companyId: string, employeeId: string) {
    const [employee] = await query(
      `SELECT id, employee_code, first_name, last_name, card_number
       FROM employees WHERE id = $1 AND company_id = $2`,
      [employeeId, companyId],
    );

    if (!employee) {
      logger.warn('Employee not found for push', { employeeId });
      return;
    }

    const devices = await query(
      `SELECT * FROM devices WHERE company_id = $1 AND is_enabled = true AND status != 'error'`,
      [companyId],
    );

    for (const device of devices) {
      const client = new ZKTecoClient({
        ip: device.ip_address,
        port: device.port,
        timeout: config.worker.deviceTimeoutMs,
      });

      try {
        await client.connect();

        // Get or assign device UID
        let uid = await this.getOrAssignDeviceUid(device.id, companyId, employeeId);

        await client.setUser({
          uid,
          userId: employee.employee_code,
          name: `${employee.first_name} ${employee.last_name}`.slice(0, 24),
          cardNo: employee.card_number || '0',
          role: 0,
          password: '',
        });

        // Update mapping synced_at
        await query(
          `UPDATE device_employee_map SET synced_at = NOW()
           WHERE device_id = $1 AND employee_id = $2`,
          [device.id, employeeId],
        );

        await client.disconnect();

        logger.info('User pushed to device', {
          employeeId,
          deviceId: device.id,
          uid,
        });
      } catch (err) {
        logger.error('Failed to push user to device', {
          employeeId,
          deviceId: device.id,
          error: err.message,
        });
        try { await client.disconnect(); } catch (_) {}
      }
    }

    // Mark biometric status as enrolled if at least one device succeeded
    await query(
      `UPDATE employees SET biometric_status = 'enrolled' WHERE id = $1`,
      [employeeId],
    );
  }

  private async getOrAssignDeviceUid(
    deviceId: string,
    companyId: string,
    employeeId: string,
  ): Promise<number> {
    const [existing] = await query(
      `SELECT device_user_id FROM device_employee_map
       WHERE device_id = $1 AND employee_id = $2`,
      [deviceId, employeeId],
    );

    if (existing) return existing.device_user_id;

    // Find next available UID
    const [maxUid] = await query(
      `SELECT COALESCE(MAX(device_user_id), 0) as max_uid
       FROM device_employee_map WHERE device_id = $1`,
      [deviceId],
    );

    const newUid = (maxUid?.max_uid || 0) + 1;

    await query(
      `INSERT INTO device_employee_map
         (company_id, device_id, employee_id, device_user_id, synced_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (device_id, employee_id) DO UPDATE SET synced_at = NOW()`,
      [companyId, deviceId, employeeId, newUid],
    );

    return newUid;
  }

  // ─── Delete employee from all company devices ────────────────────────────────

  private async deleteUserFromDevices(companyId: string, employeeId: string) {
    const mappings = await query(
      `SELECT dem.*, d.ip_address, d.port
       FROM device_employee_map dem
       JOIN devices d ON d.id = dem.device_id
       WHERE dem.company_id = $1 AND dem.employee_id = $2
         AND d.is_enabled = true`,
      [companyId, employeeId],
    );

    for (const mapping of mappings) {
      const client = new ZKTecoClient({
        ip: mapping.ip_address,
        port: mapping.port,
        timeout: config.worker.deviceTimeoutMs,
      });

      try {
        await client.connect();
        await client.deleteUser(mapping.device_user_id);
        await client.disconnect();

        logger.info('User deleted from device', {
          employeeId,
          deviceId: mapping.device_id,
          uid: mapping.device_user_id,
        });
      } catch (err) {
        logger.error('Failed to delete user from device', {
          employeeId,
          deviceId: mapping.device_id,
          error: err.message,
        });
        try { await client.disconnect(); } catch (_) {}
      }
    }

    // Remove all mappings
    await query(
      `DELETE FROM device_employee_map WHERE company_id = $1 AND employee_id = $2`,
      [companyId, employeeId],
    );
  }
}
