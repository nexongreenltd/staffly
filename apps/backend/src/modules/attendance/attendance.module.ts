import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { DailyAttendance } from '../../database/entities/daily-attendance.entity';
import { AttendanceLog } from '../../database/entities/attendance-log.entity';
import { Employee } from '../../database/entities/employee.entity';
import { Shift } from '../../database/entities/shift.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailyAttendance, AttendanceLog, Employee, Shift]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
