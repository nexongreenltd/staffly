import {
  Injectable, NotFoundException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../database/entities/employee.entity';
import { User } from '../../database/entities/user.entity';
import { DeviceEmployeeMap } from '../../database/entities/device-employee-map.entity';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeStatus, BiometricStatus, UserRole } from '../../common/enums';
import { UsersService } from '../users/users.service';
import { DeviceSyncProducer } from '../queue/producers/device-sync.producer';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(DeviceEmployeeMap)
    private deviceMapRepo: Repository<DeviceEmployeeMap>,
    private usersService: UsersService,
    private deviceSyncProducer: DeviceSyncProducer,
  ) {}

  async create(companyId: string, dto: CreateEmployeeDto) {
    const existing = await this.employeeRepo.findOne({
      where: { companyId, employeeCode: dto.employeeCode },
    });
    if (existing) throw new ConflictException('Employee code already exists');

    const employee = this.employeeRepo.create({
      companyId,
      employeeCode: dto.employeeCode,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      designation: dto.designation,
      joiningDate: dto.joiningDate,
      departmentId: dto.departmentId,
      shiftId: dto.shiftId,
      cardNumber: dto.cardNumber,
      biometricStatus: BiometricStatus.PENDING,
    });
    await this.employeeRepo.save(employee);

    // Optionally create login account
    if (dto.password && dto.email) {
      await this.usersService.createUser({
        companyId,
        employeeId: employee.id,
        email: dto.email,
        password: dto.password,
        role: UserRole.EMPLOYEE,
      });
      this.logger.log(`Created user account for employee ${employee.id}`);
    }

    // Queue push to all company devices (non-blocking — no devices is fine)
    try {
      await this.deviceSyncProducer.addPushUserJob(companyId, employee.id);
    } catch (err) {
      this.logger.warn(`Could not queue device sync for employee ${employee.id}: ${(err as Error).message}`);
    }

    return employee;
  }

  async findAll(companyId: string, query: {
    page?: number;
    limit?: number;
    status?: EmployeeStatus;
    search?: string;
    departmentId?: string;
  }) {
    const { page = 1, limit = 20, status, search, departmentId } = query;

    const qb = this.employeeRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.shift', 'shift')
      .where('e.company_id = :companyId', { companyId });

    if (status) qb.andWhere('e.status = :status', { status });
    if (departmentId) qb.andWhere('e.department_id = :departmentId', { departmentId });
    if (search) {
      qb.andWhere(
        '(e.first_name ILIKE :s OR e.last_name ILIKE :s OR e.employee_code ILIKE :s OR e.email ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('e.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(companyId: string, id: string) {
    const employee = await this.employeeRepo.findOne({
      where: { id, companyId },
      relations: ['shift'],
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(companyId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findOne(companyId, id);
    await this.employeeRepo.update({ id, companyId }, dto as any);

    // If relevant fields changed, resync to devices
    if (dto.firstName || dto.lastName || dto.cardNumber) {
      await this.deviceSyncProducer.addPushUserJob(companyId, id);
    }

    return this.findOne(companyId, id);
  }

  async activate(companyId: string, id: string) {
    await this.findOne(companyId, id); // validates exists
    await this.employeeRepo.update({ id, companyId }, { status: EmployeeStatus.ACTIVE });
    try {
      await this.deviceSyncProducer.addPushUserJob(companyId, id);
    } catch (err) {
      this.logger.warn(`Could not queue device sync on activate for ${id}: ${(err as Error).message}`);
    }
    return this.findOne(companyId, id);
  }

  async deactivate(companyId: string, id: string) {
    await this.findOne(companyId, id); // validates exists
    await this.employeeRepo.update({ id, companyId }, { status: EmployeeStatus.INACTIVE });
    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.employeeRepo.update(
      { id, companyId },
      { status: EmployeeStatus.TERMINATED, biometricStatus: BiometricStatus.DISABLED },
    );
    try {
      await this.deviceSyncProducer.addDeleteUserJob(companyId, id);
    } catch (err) {
      this.logger.warn(`Could not queue device removal for ${id}: ${(err as Error).message}`);
    }
    return { message: 'Employee terminated and removal queued on devices' };
  }

  async getDeviceMappings(companyId: string, employeeId: string) {
    return this.deviceMapRepo.find({
      where: { companyId, employeeId },
      relations: ['device'],
    });
  }
}
