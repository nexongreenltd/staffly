import {
  Injectable, ConflictException, NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Company } from '../../database/entities/company.entity';
import { User } from '../../database/entities/user.entity';
import { Shift } from '../../database/entities/shift.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/create-company.dto';
import { UserRole } from '../../common/enums';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Shift)
    private shiftRepo: Repository<Shift>,
  ) {}

  async create(dto: CreateCompanyDto) {
    const existing = await this.companyRepo.findOne({
      where: [{ slug: dto.slug }, { email: dto.email }],
    });
    if (existing) throw new ConflictException('Company slug or email already exists');

    const company = this.companyRepo.create({
      name: dto.name,
      slug: dto.slug,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      timezone: dto.timezone || 'UTC',
    });
    await this.companyRepo.save(company);

    // Create default admin user
    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    await this.userRepo.save({
      companyId: company.id,
      email: dto.email,
      passwordHash,
      role: UserRole.COMPANY_ADMIN,
    });

    // Create default shift
    await this.shiftRepo.save({
      companyId: company.id,
      name: 'General Shift',
      shiftStartTime: '09:00:00',
      shiftEndTime: '18:00:00',
      graceMinutes: 10,
      isDefault: true,
    });

    this.logger.log(`Company created: ${company.slug}`);
    return company;
  }

  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.companyRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOne(id);
    await this.companyRepo.update(id, dto);
    return this.findOne(id);
  }

  async toggleActive(id: string) {
    const company = await this.findOne(id);
    await this.companyRepo.update(id, { isActive: !company.isActive });
    return this.findOne(id);
  }
}
