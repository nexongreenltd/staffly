import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { Company } from '../../database/entities/company.entity';
import { User } from '../../database/entities/user.entity';
import { Shift } from '../../database/entities/shift.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, User, Shift])],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
