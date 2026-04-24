import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Company } from '../../database/entities/company.entity';
import { User } from '../../database/entities/user.entity';
import { Employee } from '../../database/entities/employee.entity';
import { Device } from '../../database/entities/device.entity';
import { AttendanceLog } from '../../database/entities/attendance-log.entity';
import { UserRole, DeviceStatus } from '../../common/enums';

@Injectable()
export class SuperadminService {
  constructor(
    @InjectRepository(Company)   private companyRepo: Repository<Company>,
    @InjectRepository(User)      private userRepo: Repository<User>,
    @InjectRepository(Employee)  private employeeRepo: Repository<Employee>,
    @InjectRepository(Device)    private deviceRepo: Repository<Device>,
    @InjectRepository(AttendanceLog) private logRepo: Repository<AttendanceLog>,
  ) {}

  // ─── System-wide stats ───────────────────────────────────────────────────────
  async getSystemStats() {
    const [
      totalCompanies,
      activeCompanies,
      totalEmployees,
      totalDevices,
      activeDevices,
      totalLogs,
    ] = await Promise.all([
      this.companyRepo.count(),
      this.companyRepo.count({ where: { isActive: true } }),
      this.employeeRepo.count(),
      this.deviceRepo.count(),
      this.deviceRepo.count({ where: { status: DeviceStatus.ACTIVE } }),
      this.logRepo.count(),
    ]);

    // Subscriptions breakdown
    const subscriptions = await this.companyRepo
      .createQueryBuilder('c')
      .select('c.subscription, COUNT(*) as count')
      .groupBy('c.subscription')
      .getRawMany();

    // New companies this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const newThisMonth = await this.companyRepo
      .createQueryBuilder('c')
      .where('c.created_at >= :start', { start: startOfMonth })
      .getCount();

    return {
      companies: {
        total: totalCompanies,
        active: activeCompanies,
        inactive: totalCompanies - activeCompanies,
        newThisMonth,
        bySubscription: subscriptions.reduce((acc, r) => {
          acc[r.c_subscription] = parseInt(r.count, 10);
          return acc;
        }, {} as Record<string, number>),
      },
      employees: { total: totalEmployees },
      devices: { total: totalDevices, active: activeDevices },
      attendanceLogs: { total: totalLogs },
    };
  }

  // ─── Companies with per-company stats ───────────────────────────────────────
  async getCompaniesWithStats(page = 1, limit = 20, search?: string) {
    const qb = this.companyRepo.createQueryBuilder('c');
    if (search) {
      qb.where('c.name ILIKE :s OR c.slug ILIKE :s OR c.email ILIKE :s', {
        s: `%${search}%`,
      });
    }
    const [companies, total] = await qb
      .orderBy('c.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    // Attach employee + device counts per company
    const ids = companies.map((c) => c.id);
    if (ids.length === 0) return { data: [], total, page, limit };

    const empCounts = await this.employeeRepo
      .createQueryBuilder('e')
      .select('e.company_id, COUNT(*) as count')
      .where('e.company_id IN (:...ids)', { ids })
      .groupBy('e.company_id')
      .getRawMany();

    const devCounts = await this.deviceRepo
      .createQueryBuilder('d')
      .select('d.company_id, COUNT(*) as count')
      .where('d.company_id IN (:...ids)', { ids })
      .groupBy('d.company_id')
      .getRawMany();

    const empMap = new Map(empCounts.map((r) => [r.e_company_id, parseInt(r.count, 10)]));
    const devMap = new Map(devCounts.map((r) => [r.d_company_id, parseInt(r.count, 10)]));

    const data = companies.map((c) => ({
      ...c,
      employeeCount: empMap.get(c.id) || 0,
      deviceCount: devMap.get(c.id) || 0,
    }));

    return { data, total, page, limit };
  }

  // ─── Single company detail ───────────────────────────────────────────────────
  async getCompanyDetail(id: string) {
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) return null;

    const [employees, devices, admins, logCount] = await Promise.all([
      this.employeeRepo.count({ where: { companyId: id } }),
      this.deviceRepo.find({ where: { companyId: id } }),
      this.userRepo.find({
        where: { companyId: id, role: UserRole.COMPANY_ADMIN },
        select: ['id', 'email', 'isActive', 'lastLoginAt', 'createdAt'],
      }),
      this.logRepo.count({ where: { companyId: id } }),
    ]);

    return {
      ...company,
      stats: {
        employees,
        devices: devices.length,
        activeDevices: devices.filter((d) => d.status === DeviceStatus.ACTIVE).length,
        attendanceLogs: logCount,
      },
      admins,
      devices,
    };
  }

  // ─── Toggle company active ───────────────────────────────────────────────────
  async toggleCompany(id: string) {
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) return null;
    await this.companyRepo.update(id, { isActive: !company.isActive });
    return this.companyRepo.findOne({ where: { id } });
  }

  // ─── Reset company admin password ───────────────────────────────────────────
  async resetAdminPassword(companyId: string, newPassword: string) {
    const admin = await this.userRepo.findOne({
      where: { companyId, role: UserRole.COMPANY_ADMIN },
    });
    if (!admin) return { message: 'No admin found' };
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(admin.id, { passwordHash });
    return { message: 'Password reset successfully' };
  }

  // ─── Recent activity feed ────────────────────────────────────────────────────
  async getRecentActivity(limit = 10) {
    const recentCompanies = await this.companyRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      select: ['id', 'name', 'slug', 'isActive', 'createdAt'],
    });
    return { recentCompanies };
  }
}
