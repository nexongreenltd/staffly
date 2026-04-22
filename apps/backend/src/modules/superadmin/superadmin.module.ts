import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';
import { Company } from '../../database/entities/company.entity';
import { User } from '../../database/entities/user.entity';
import { Employee } from '../../database/entities/employee.entity';
import { Device } from '../../database/entities/device.entity';
import { AttendanceLog } from '../../database/entities/attendance-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, User, Employee, Device, AttendanceLog]),
  ],
  controllers: [SuperadminController],
  providers: [SuperadminService],
})
export class SuperadminModule {}
