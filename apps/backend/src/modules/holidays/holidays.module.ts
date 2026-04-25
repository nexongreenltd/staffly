import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';
import { Holiday } from '../../database/entities/holiday.entity';
import { DailyAttendance } from '../../database/entities/daily-attendance.entity';
import { Employee } from '../../database/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Holiday, DailyAttendance, Employee])],
  controllers: [HolidaysController],
  providers: [HolidaysService],
})
export class HolidaysModule {}
