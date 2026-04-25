import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Holiday } from '../../database/entities/holiday.entity';
import { DailyAttendance } from '../../database/entities/daily-attendance.entity';
import { Employee } from '../../database/entities/employee.entity';
import { AttendanceStatus } from '../../common/enums';

@Injectable()
export class HolidaysService {
  private readonly logger = new Logger(HolidaysService.name);

  constructor(
    @InjectRepository(Holiday)
    private holidayRepo: Repository<Holiday>,
    @InjectRepository(DailyAttendance)
    private dailyRepo: Repository<DailyAttendance>,
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
  ) {}

  async create(companyId: string, data: { date: string; name: string; description?: string }) {
    const existing = await this.holidayRepo.findOne({
      where: { companyId, date: data.date },
    });
    if (existing) throw new ConflictException('A holiday already exists on this date');

    const holiday = await this.holidayRepo.save(
      this.holidayRepo.create({ companyId, ...data }),
    );

    // Mark all active employees as holiday for this date
    await this.markAllEmployeesHoliday(companyId, data.date);

    return holiday;
  }

  async findAll(companyId: string, year: number) {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    return this.holidayRepo
      .createQueryBuilder('h')
      .where('h.company_id = :companyId AND h.date BETWEEN :start AND :end', { companyId, start, end })
      .orderBy('h.date', 'ASC')
      .getMany();
  }

  async remove(companyId: string, id: string) {
    const holiday = await this.holidayRepo.findOne({ where: { id, companyId } });
    if (!holiday) throw new NotFoundException('Holiday not found');

    // Revert holiday attendance records that were auto-created (not manually corrected)
    await this.dailyRepo
      .createQueryBuilder()
      .delete()
      .where(
        'company_id = :companyId AND date = :date AND status = :status AND is_manual = false',
        { companyId, date: holiday.date, status: AttendanceStatus.HOLIDAY },
      )
      .execute();

    await this.holidayRepo.remove(holiday);
    return { message: 'Holiday deleted' };
  }

  private async markAllEmployeesHoliday(companyId: string, date: string) {
    const employees = await this.employeeRepo.find({
      where: { companyId, status: 'active' as any },
      select: ['id'],
    });

    for (const emp of employees) {
      await this.dailyRepo
        .createQueryBuilder()
        .insert()
        .into(DailyAttendance)
        .values({
          companyId,
          employeeId: emp.id,
          date,
          status: AttendanceStatus.HOLIDAY,
          isManual: false,
        })
        .orUpdate(['status'], ['company_id', 'employee_id', 'date'], {
          skipUpdateIfNoValuesChanged: false,
        })
        .execute()
        .catch((err) =>
          this.logger.warn(`Could not mark holiday for employee ${emp.id}: ${err.message}`),
        );
    }
  }
}
