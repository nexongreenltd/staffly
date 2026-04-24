/**
 * Staffly Worker
 *
 * Responsibilities:
 *   1. Scheduler: Every N minutes, queue sync jobs for all active devices
 *   2. DeviceSyncWorker: BullMQ workers for device sync / push / delete
 *   3. AttendanceProcessorWorker: processes raw logs into daily_attendance
 */

import http from 'http';
import { config } from './config';
import { logger } from './utils/logger';
import { query, getPool } from './db/db';
import { DeviceSyncWorker } from './workers/device-sync.worker';
import { AttendanceProcessorWorker } from './workers/attendance-processor.worker';
import Bull from 'bull';
import { format, subDays } from 'date-fns';

async function bootstrap() {
  logger.info('🚀 Staffly Worker starting...');

  // Start health server immediately so Cloud Run startup probe passes
  const port = process.env.PORT || 8080;
  const server = http.createServer((_, res) => {
    res.writeHead(200);
    res.end('ok');
  });
  await new Promise<void>((resolve) => server.listen(port, () => {
    logger.info(`Health server listening on port ${port}`);
    resolve();
  }));

  // Test DB connection
  try {
    await query('SELECT NOW()');
    logger.info('✅ Database connected');
  } catch (err) {
    logger.error('❌ Database connection failed', { error: err.message });
    process.exit(1);
  }

  // Initialize workers
  const deviceSyncWorker = new DeviceSyncWorker();
  const attendanceProcessor = new AttendanceProcessorWorker();

  // Bull queue for scheduling
  const schedulerQueue = new Bull('scheduler', { redis: config.redis });

  // ─── Scheduler: runs every N minutes ─────────────────────────────────────────
  const runScheduler = async () => {
    logger.info('Scheduler tick: queuing device syncs');

    try {
      // Get all active, enabled devices
      const devices = await query(
        `SELECT d.id, d.company_id, d.name, d.sync_interval,
                d.last_synced_at, d.is_enabled
         FROM devices d
         JOIN companies c ON c.id = d.company_id
         WHERE d.is_enabled = true AND c.is_active = true
         ORDER BY d.last_synced_at ASC NULLS FIRST`,
      );

      const now = Date.now();
      let queued = 0;

      for (const device of devices) {
        const intervalMs = (device.sync_interval || 5) * 60 * 1000;
        const lastSync = device.last_synced_at
          ? new Date(device.last_synced_at).getTime()
          : 0;

        if (now - lastSync >= intervalMs) {
          await schedulerQueue.add(
            'trigger-sync',
            { deviceId: device.id, companyId: device.company_id },
            { priority: 5, removeOnComplete: 20 },
          );
          queued++;
        }
      }

      logger.info(`Scheduler: queued ${queued}/${devices.length} device syncs`);
    } catch (err) {
      logger.error('Scheduler error', { error: err.message });
    }
  };

  // Process scheduler triggers
  schedulerQueue.process('trigger-sync', 10, async (job) => {
    const { deviceId, companyId } = job.data;
    // Forward to device-sync queue
    const deviceSync = new Bull('device-sync', { redis: config.redis });
    await deviceSync.add(
      'sync-device',
      { deviceId, companyId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  });

  // ─── Attendance processing scheduler ─────────────────────────────────────────
  const runAttendanceProcessor = async () => {
    logger.info('Attendance processor tick');

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

      const companies = await query(
        `SELECT id FROM companies WHERE is_active = true`,
      );

      for (const company of companies) {
        // Process today's logs
        await attendanceProcessor.addProcessJob(company.id, today);
        // Also process yesterday's in case of late syncs
        await attendanceProcessor.addProcessJob(company.id, yesterday);
        // Mark absents for yesterday (day is complete)
        await attendanceProcessor.addMarkAbsentsJob(company.id, yesterday);
      }
    } catch (err) {
      logger.error('Attendance processor schedule error', { error: err.message });
    }
  };

  // ─── Start scheduling loops ───────────────────────────────────────────────────

  // Initial run
  await runScheduler();
  await runAttendanceProcessor();

  // Recurring ticks
  setInterval(runScheduler, config.worker.schedulerIntervalMs);
  setInterval(runAttendanceProcessor, config.worker.schedulerIntervalMs);

  logger.info(
    `⏱  Scheduler running every ${config.worker.schedulerIntervalMs / 60000} minutes`,
  );

  // ─── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close();
    await schedulerQueue.close();
    await getPool().end();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
  });
}

bootstrap();
