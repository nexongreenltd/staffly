import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { eachDayOfInterval, parseISO, format } from 'date-fns';
import { LeaveRequest } from '../../database/entities/leave-request.entity';
import { DailyAttendance } from '../../database/entities/daily-attendance.entity';
import { LeaveType, LeaveStatus, AttendanceStatus } from '../../common/enums';

@Injectable()
export class LeavesService {
  private readonly logger = new Logger(LeavesService.name);

  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(DailyAttendance)
    private dailyRepo: Repository<DailyAttendance>,
  ) {}

  async create(companyId: string, employeeId: string, data: {
    startDate: string;
    endDate: string;
    leaveType: LeaveType;
    reason: string;
  }) {
    if (data.startDate > data.endDate) {
      throw new BadRequestException('End date must be on or after start date');
    }

    const request = await this.leaveRepo.save(
      this.leaveRepo.create({ companyId, employeeId, ...data }),
    );
    return request;
  }

  async findAll(companyId: string, query: {
    status?: LeaveStatus;
    employeeId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, employeeId, page = 1, limit = 30 } = query;

    const qb = this.leaveRepo
      .createQueryBuilder('lr')
      .leftJoinAndSelect('lr.employee', 'emp')
      .leftJoinAndSelect('lr.reviewer', 'rev')
      .where('lr.company_id = :companyId', { companyId });

    if (status) qb.andWhere('lr.status = :status', { status });
    if (employeeId) qb.andWhere('lr.employee_id = :employeeId', { employeeId });

    const [data, total] = await qb
      .orderBy('lr.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findMine(companyId: string, employeeId: string, page = 1, limit = 20) {
    const [data, total] = await this.leaveRepo
      .createQueryBuilder('lr')
      .leftJoinAndSelect('lr.reviewer', 'rev')
      .where('lr.company_id = :companyId AND lr.employee_id = :employeeId', { companyId, employeeId })
      .orderBy('lr.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async approve(companyId: string, id: string, reviewedBy: string, reviewNote?: string) {
    const leave = await this.findOne(companyId, id);
    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    leave.status = LeaveStatus.APPROVED;
    leave.reviewedBy = reviewedBy;
    leave.reviewNote = reviewNote || null;
    await this.leaveRepo.save(leave);

    // Mark each day in the range as on_leave
    await this.applyLeaveDays(companyId, leave.employeeId, leave.startDate, leave.endDate);

    return leave;
  }

  async reject(companyId: string, id: string, reviewedBy: string, reviewNote?: string) {
    const leave = await this.findOne(companyId, id);
    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    leave.status = LeaveStatus.REJECTED;
    leave.reviewedBy = reviewedBy;
    leave.reviewNote = reviewNote || null;
    await this.leaveRepo.save(leave);

    return leave;
  }

  async cancel(companyId: string, id: string, employeeId: string) {
    const leave = await this.findOne(companyId, id);
    if (leave.employeeId !== employeeId) throw new NotFoundException('Leave request not found');
    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }
    await this.leaveRepo.remove(leave);
    return { message: 'Leave request cancelled' };
  }

  private async findOne(companyId: string, id: string) {
    const leave = await this.leaveRepo.findOne({ where: { id, companyId } });
    if (!leave) throw new NotFoundException('Leave request not found');
    return leave;
  }

  private async applyLeaveDays(companyId: string, employeeId: string, startDate: string, endDate: string) {
    const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    for (const day of days) {
      const date = format(day, 'yyyy-MM-dd');
      try {
        await this.dailyRepo
          .createQueryBuilder()
          .insert()
          .into(DailyAttendance)
          .values({ companyId, employeeId, date, status: AttendanceStatus.ON_LEAVE, isManual: true })
          .orUpdate(['status', 'is_manual'], ['company_id', 'employee_id', 'date'], {
            skipUpdateIfNoValuesChanged: false,
          })
          .execute();
      } catch (err) {
        this.logger.warn(`Could not mark leave for ${employeeId} on ${date}: ${(err as Error).message}`);
      }
    }
  }
}
