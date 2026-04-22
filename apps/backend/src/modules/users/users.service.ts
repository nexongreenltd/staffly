import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { UserRole } from '../../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async createUser(data: {
    companyId: string;
    employeeId?: string;
    email: string;
    password: string;
    role: UserRole;
  }) {
    const exists = await this.userRepo.findOne({ where: { email: data.email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = this.userRepo.create({
      companyId: data.companyId,
      employeeId: data.employeeId,
      email: data.email,
      passwordHash,
      role: data.role,
    });
    return this.userRepo.save(user);
  }

  async findByCompany(companyId: string) {
    return this.userRepo.find({
      where: { companyId },
      select: ['id', 'email', 'role', 'isActive', 'lastLoginAt', 'createdAt'],
    });
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async resetPassword(id: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(id, { passwordHash });
  }
}
