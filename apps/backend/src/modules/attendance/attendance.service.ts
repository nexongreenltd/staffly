import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not } from 'typeorm';
import { format, parseISO, differenceInMinutes, addMinutes, parse } from 'date-fns';
import { DailyAttendance } from '../../database/entities/daily-attendance.entity';
import { AttendanceLog } from '../../database/entities/attendance-log.entity';
import { Employee } from '../../database/entities/employee.entity';
import { Shift } from '../../database/entities/shift.entity';
import { AttendanceStatus } from '../../common/enums';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(DailyAttendance)
    private dailyRepo: Repository<DailyAttendance>,
    @InjectRepository(AttendanceLog)
    private logRepo: Repository<AttendanceLog>,
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
    @InjectRepository(Shift)
    private shiftRepo: Repository<Shift>,
  ) {}

  // ─── Process unprocessed logs for a date ────────────────────────────────────
  async processLogsForDate(companyId: string, date: string) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const unprocessed = await this.logRepo.find({
      where: {
        companyId,
        punchTime: Between(startOfDay, endOfDay),
        isProcessed: false,
        employeeId: Not(IsNull()),
      },
      order: { punchTime: 'ASC' },
    });

    if (unprocessed.length === 0) return { processed: 0 };

    // Group by employee
    const byEmployee = new Map<string, typeof unprocessed>();
    for (const log of unprocessed) {
      const list = byEmployee.get(log.employeeId) || [];
      list.push(log);
      byEmployee.set(log.employeeId, list);
    }

    let processed = 0;
    for (const [employeeId, logs] of byEmployee) {
      await this.processEmployeeDay(companyId, employeeId, date, logs);
      await this.logRepo.update(
        logs.map((l) => l.id),
        { isProcessed: true },
      );
      processed++;
    }

    return { processed };
  }

  private async processEmployeeDay(
    companyId: string,
    employeeId: string,
    date: string,
    logs: AttendanceLog[],
  ) {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['shift'],
    });
    if (!employee) return;

    // Use employee's shift or company default
    let shift = employee.shift;
    if (!shift) {
      shift = await this.shiftRepo.findOne({
        where: { companyId, isDefault: true },
      });
    }

    const checkIn = logs[0]?.punchTime;
    const checkOut = logs.length > 1 ? logs[logs.length - 1].punchTime : null;

    let workingHours = 0;
    let lateMinutes = 0;
    let earlyOutMin = 0;
    let overtimeMin = 0;
    let status: AttendanceStatus = AttendanceStatus.PRESENT;

    if (checkIn && shift) {
      // Late calculation
      const shiftStart = parse(shift.shiftStartTime, 'HH:mm:ss', parseISO(date));
      const lateThreshold = addMinutes(shiftStart, shift.graceMinutes);

      if (checkIn > lateThreshold) {
        lateMinutes = differenceInMinutes(checkIn, shiftStart);
        status = AttendanceStatus.LATE;
      }

      // Working hours
      if (checkOut) {
        workingHours = Math.round(differenceInMinutes(checkOut, checkIn) / 60 * 100) / 100;

        // Early out
        const shiftEnd = parse(shift.shiftEndTime, 'HH:mm:ss', parseISO(date));
        if (checkOut < shiftEnd) {
          earlyOutMin = differenceInMinutes(shiftEnd, checkOut);
          if (workingHours < 4) status = AttendanceStatus.HALF_DAY;
        }

        // Overtime
        if (checkOut > shiftEnd) {
          overtimeMin = differenceInMinutes(checkOut, shiftEnd);
        }
      }
    }

    // Upsert daily attendance
    const existing = await this.dailyRepo.findOne({
      where: { companyId, employeeId, date },
    });

    if (existing && existing.isManual) {
      // Don't overwrite manual corrections
      return;
    }

    await this.dailyRepo.upsert(
      {
        companyId,
        employeeId,
        shiftId: shift?.id,
        date,
        checkIn,
        checkOut,
        workingHours,
        lateMinutes,
        earlyOutMin,
        overtimeMin,
        status,
        isManual: false,
      },
      { conflictPaths: ['companyId', 'employeeId', 'date'] },
    );
  }

  // ─── Mark absent employees for a date ───────────────────────────────────────
  async markAbsentsForDate(companyId: string, date: string) {
    const activeEmployees = await this.employeeRepo.find({
      where: { companyId, status: 'active' as any },
      select: ['id'],
    });

    const attendedIds = await this.dailyRepo
      .createQueryBuilder('da')
      .select('da.employee_id')
      .where('da.company_id = :companyId AND da.date = :date', { companyId, date })
      .getRawMany();

    const attendedSet = new Set(attendedIds.map((r) => r.da_employee_id));

    const absentEmployees = activeEmployees
      .filter((e) => !attendedSet.has(e.id))
      .map((e) => ({
        companyId,
        employeeId: e.id,
        date,
        status: AttendanceStatus.ABSENT,
      }));

    if (absentEmployees.length > 0) {
      await this.dailyRepo
        .createQueryBuilder()
        .insert()
        .into(DailyAttendance)
        .values(absentEmployees)
        .orIgnore()
        .execute();
    }

    return { markedAbsent: absentEmployees.length };
  }

  // ─── Query APIs ─────────────────────────────────────────────────────────────
  async getDailyAttendance(companyId: string, query: {
    date: string;
    page?: number;
    limit?: number;
    status?: AttendanceStatus;
    departmentId?: string;
    employeeId?: string;
  }) {
    const { date, page = 1, limit = 50, status, employeeId } = query;

    const qb = this.dailyRepo
      .createQueryBuilder('da')
      .leftJoinAndSelect('da.employee', 'emp')
      .leftJoinAndSelect('da.shift', 'shift')
      .where('da.company_id = :companyId AND da.date = :date', { companyId, date });

    if (status) qb.andWhere('da.status = :status', { status });
    if (employeeId) qb.andWhere('da.employee_id = :employeeId', { employeeId });

    const [data, total] = await qb
      .orderBy('emp.first_name', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    // Summary stats
    const summary = await this.getDailySummary(companyId, date);

    return { data, total, page, limit, summary };
  }

  async getMonthlyReport(companyId: string, query: {
    year: number;
    month: number;
    employeeId?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
  }) {
    const { year, month, employeeId, page = 1, limit = 30 } = query;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0); // last day of month
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    const qb = this.dailyRepo
      .createQueryBuilder('da')
      .leftJoinAndSelect('da.employee', 'emp')
      .where(
        'da.company_id = :companyId AND da.date BETWEEN :startDate AND :endDate',
        { companyId, startDate, endDate: endDateStr },
      );

    if (employeeId) qb.andWhere('da.employee_id = :employeeId', { employeeId });

    const records = await qb
      .orderBy('emp.employee_code', 'ASC')
      .addOrderBy('da.date', 'ASC')
      .getMany();

    // Pivot by employee
    const byEmployee = new Map<string, any>();
    for (const r of records) {
      const emp = r.employee;
      if (!byEmployee.has(r.employeeId)) {
        byEmployee.set(r.employeeId, {
          employee: {
            id: emp.id,
            code: emp.employeeCode,
            name: `${emp.firstName} ${emp.lastName}`,
          },
          present: 0,
          late: 0,
          absent: 0,
          halfDay: 0,
          totalWorkingHours: 0,
          totalOvertimeMin: 0,
          days: [],
        });
      }
      const entry = byEmployee.get(r.employeeId);
      if (r.status === AttendanceStatus.PRESENT) entry.present++;
      else if (r.status === AttendanceStatus.LATE) { entry.present++; entry.late++; }
      else if (r.status === AttendanceStatus.ABSENT) entry.absent++;
      else if (r.status === AttendanceStatus.HALF_DAY) entry.halfDay++;
      entry.totalWorkingHours += Number(r.workingHours || 0);
      entry.totalOvertimeMin += r.overtimeMin || 0;
      entry.days.push({
        date: r.date,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        status: r.status,
        workingHours: r.workingHours,
        lateMinutes: r.lateMinutes,
      });
    }

    return {
      year,
      month,
      data: Array.from(byEmployee.values()),
    };
  }

  async getDailySummary(companyId: string, date: string) {
    const result = await this.dailyRepo
      .createQueryBuilder('da')
      .select('da.status, COUNT(*) as count')
      .where('da.company_id = :companyId AND da.date = :date', { companyId, date })
      .groupBy('da.status')
      .getRawMany();

    const summary: Record<string, number> = {};
    for (const r of result) {
      summary[r.da_status] = parseInt(r.count, 10);
    }
    return {
      present: (summary.present || 0) + (summary.late || 0),
      late: summary.late || 0,
      absent: summary.absent || 0,
      halfDay: summary.half_day || 0,
      onLeave: summary.on_leave || 0,
      holiday: summary.holiday || 0,
    };
  }

  // ─── Manual correction ───────────────────────────────────────────────────────
  async manualCorrection(companyId: string, employeeId: string, date: string, data: {
    checkIn?: string;
    checkOut?: string;
    status?: AttendanceStatus;
    reason: string;
    correctedBy: string;
  }) {
    const checkIn = data.checkIn ? new Date(data.checkIn) : null;
    const checkOut = data.checkOut ? new Date(data.checkOut) : null;
    let workingHours = 0;

    if (checkIn && checkOut) {
      workingHours = differenceInMinutes(checkOut, checkIn) / 60;
    }

    await this.dailyRepo.upsert(
      {
        companyId,
        employeeId,
        date,
        checkIn,
        checkOut,
        workingHours,
        status: data.status || AttendanceStatus.PRESENT,
        isManual: true,
        manualReason: data.reason,
        correctedBy: data.correctedBy,
      },
      { conflictPaths: ['companyId', 'employeeId', 'date'] },
    );

    return this.dailyRepo.findOne({ where: { companyId, employeeId, date } });
  }
}
