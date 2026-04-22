import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../database/entities/company.entity';

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      companyId?: string;
      company?: Company;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Company slug from header or subdomain
    const slug =
      req.headers['x-company-slug'] as string ||
      this.extractSlugFromHost(req.hostname);

    if (!slug) {
      return next(); // Will be caught by guards on protected routes
    }

    const company = await this.companyRepo.findOne({
      where: { slug, isActive: true },
    });

    if (!company) {
      throw new UnauthorizedException('Company not found or inactive');
    }

    req.companyId = company.id;
    req.company = company;
    next();
  }

  private extractSlugFromHost(hostname: string): string | null {
    // e.g. acme.staffly.io → 'acme'
    const parts = hostname.split('.');
    if (parts.length >= 3) return parts[0];
    return null;
  }
}
