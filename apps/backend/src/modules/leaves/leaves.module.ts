import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { LeaveRequest } from '../../database/entities/leave-request.entity';
import { DailyAttendance } from '../../database/entities/daily-attendance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LeaveRequest, DailyAttendance])],
  controllers: [LeavesController],
  providers: [LeavesService],
})
export class LeavesModule {}
