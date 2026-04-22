import {
  Injectable, UnauthorizedException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, ip?: string) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['company'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.logger.warn(`Failed login attempt for ${dto.email} from ${ip}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    await this.auditRepo.save({
      companyId: user.companyId,
      userId: user.id,
      action: 'LOGIN',
      ipAddress: ip,
    });

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        company: user.company
          ? { id: user.company.id, name: user.company.name, slug: user.company.slug }
          : null,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['company'],
    });
    if (!user) throw new UnauthorizedException('User not found');
    const { passwordHash, ...profile } = user as any;
    return profile;
  }
}
