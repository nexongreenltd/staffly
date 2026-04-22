import Bull from 'bull';
import { format, subDays } from 'date-fns';
import { query } from '../db/db';
import { logger } from '../utils/logger';
import { config } from '../config';

export class AttendanceProcessorWorker {
  private queue: Bull.Queue;

  constructor() {
    this.queue = new Bull('attendance-process', {
      redis: config.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    });

    this.queue.process('process-date', 5, async (job) => {
      const { companyId, date } = job.data;
      await this.processAttendanceForDate(companyId, date);
    });

    this.queue.process('mark-absents', 5, async (job) => {
      const { companyId, date } = job.data;
      await this.markAbsentsForDate(companyId, date);
    });

    this.queue.on('completed', (job) => {
      logger.info('Attendance processing completed', { jobId: job.id, name: job.name });
    });

    this.queue.on('failed', (job, err) => {
      logger.error('Attendance processing failed', {
        jobId: job.id,
        error: err.message,
      });
    });
  }

  // ─── Process raw logs into daily_attendance ──────────────────────────────────

  private async processAttendanceForDate(companyId: string, date: string) {
    logger.info('Processing attendance', { companyId, date });

    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    // Get unprocessed logs for this date, grouped by employee
    const logs = await query(
      `SELECT al.*, dem.employee_id
       FROM attendance_logs al
       LEFT JOIN device_employee_map dem
         ON dem.device_id = al.device_id
         AND dem.device_user_id = al.device_user_id
       WHERE al.company_id = $1
         AND al.punch_time BETWEEN $2 AND $3
         AND al.is_processed = false
       ORDER BY al.employee_id, al.punch_time ASC`,
      [companyId, startOfDay, endOfDay],
    );

    // Group by employee
    const byEmployee = new Map<string, typeof logs>();
    for (const log of logs) {
      const empId = log.employee_id;
      if (!empId) continue;
      const list = byEmployee.get(empId) || [];
      list.push(log);
      byEmployee.set(empId, list);
    }

    let processed = 0;

    for (const [employeeId, empLogs] of byEmployee) {
      await this.processEmployeeDay(companyId, employeeId, date, empLogs);
      // Mark as processed
      const ids = empLogs.map((l) => l.id);
      if (ids.length > 0) {
        await query(
          `UPDATE attendance_logs SET is_processed = true WHERE id = ANY($1::uuid[])`,
          [ids],
        );
      }
      processed++;
    }

    logger.info('Attendance processing completed', { companyId, date, processed });
    return { processed };
  }

  private async processEmployeeDay(
    companyId: string,
    employeeId: string,
    date: string,
    logs: any[],
  ) {
    // Get employee + shift
    const [employee] = await query(
      `SELECT e.*, s.shift_start_time, s.shift_end_time, s.grace_minutes, s.overnight, s.id as shift_id
       FROM employees e
       LEFT JOIN shifts s ON s.id = e.shift_id
       WHERE e.id = $1 AND e.company_id = $2`,
      [employeeId, companyId],
    );

    if (!employee) return;

    // If no shift on employee, get company default
    let shift = employee.shift_start_time ? employee : null;
    if (!shift) {
      const [defaultShift] = await query(
        `SELECT * FROM shifts WHERE company_id = $1 AND is_default = true LIMIT 1`,
        [companyId],
      );
      shift = defaultShift;
    }

    const checkIn = logs[0]?.punch_time ? new Date(logs[0].punch_time) : null;
    const checkOut =
      logs.length > 1 ? new Date(logs[logs.length - 1].punch_time) : null;

    let workingHours = 0;
    let lateMinutes = 0;
    let earlyOutMin = 0;
    let overtimeMin = 0;
    let status = 'present';

    if (checkIn && shift) {
      // Parse shift times relative to the given date
      const [startH, startM] = shift.shift_start_time.split(':').map(Number);
      const shiftStart = new Date(`${date}T${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}:00.000Z`);
      const graceThreshold = new Date(shiftStart.getTime() + (shift.grace_minutes || 0) * 60000);

      if (checkIn > graceThreshold) {
        lateMinutes = Math.round((checkIn.getTime() - shiftStart.getTime()) / 60000);
        status = 'late';
      }

      if (checkOut) {
        workingHours = Math.round(
          ((checkOut.getTime() - checkIn.getTime()) / 3600000) * 100,
        ) / 100;

        const [endH, endM] = shift.shift_end_time.split(':').map(Number);
        const shiftEnd = new Date(`${date}T${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}:00.000Z`);

        if (checkOut < shiftEnd) {
          earlyOutMin = Math.round((shiftEnd.getTime() - checkOut.getTime()) / 60000);
          if (workingHours < 4) status = 'half_day';
        }

        if (checkOut > shiftEnd) {
          overtimeMin = Math.round((checkOut.getTime() - shiftEnd.getTime()) / 60000);
        }
      }
    }

    // Check if already manually corrected — don't overwrite
    const [existing] = await query(
      `SELECT id, is_manual FROM daily_attendance
       WHERE company_id = $1 AND employee_id = $2 AND date = $3`,
      [companyId, employeeId, date],
    );

    if (existing?.is_manual) return;

    await query(
      `INSERT INTO daily_attendance
         (company_id, employee_id, shift_id, date, check_in, check_out,
          working_hours, late_minutes, early_out_min, overtime_min, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (company_id, employee_id, date) DO UPDATE SET
         check_in = EXCLUDED.check_in,
         check_out = EXCLUDED.check_out,
         working_hours = EXCLUDED.working_hours,
         late_minutes = EXCLUDED.late_minutes,
         early_out_min = EXCLUDED.early_out_min,
         overtime_min = EXCLUDED.overtime_min,
         status = EXCLUDED.status,
         updated_at = NOW()
       WHERE daily_attendance.is_manual = false`,
      [
        companyId,
        employeeId,
        shift?.shift_id || shift?.id || null,
        date,
        checkIn?.toISOString() || null,
        checkOut?.toISOString() || null,
        workingHours,
        lateMinutes,
        earlyOutMin,
        overtimeMin,
        status,
      ],
    );
  }

  // ─── Mark absents ────────────────────────────────────────────────────────────

  private async markAbsentsForDate(companyId: string, date: string) {
    // Get all active employees
    const employees = await query(
      `SELECT id FROM employees WHERE company_id = $1 AND status = 'active'`,
      [companyId],
    );

    // Get employees who already have a record
    const existing = await query(
      `SELECT employee_id FROM daily_attendance
       WHERE company_id = $1 AND date = $2`,
      [companyId, date],
    );

    const existingSet = new Set(existing.map((r) => r.employee_id));
    const absent = employees.filter((e) => !existingSet.has(e.id));

    for (const emp of absent) {
      await query(
        `INSERT INTO daily_attendance (company_id, employee_id, date, status)
         VALUES ($1, $2, $3, 'absent')
         ON CONFLICT (company_id, employee_id, date) DO NOTHING`,
        [companyId, emp.id, date],
      );
    }

    logger.info('Absent marking done', {
      companyId,
      date,
      markedAbsent: absent.length,
    });
  }

  async addProcessJob(companyId: string, date: string) {
    return this.queue.add('process-date', { companyId, date });
  }

  async addMarkAbsentsJob(companyId: string, date: string) {
    return this.queue.add('mark-absents', { companyId, date });
  }
}
