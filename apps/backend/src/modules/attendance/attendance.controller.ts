import {
  Controller, Get, Post, Body, Query, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompanyId, CurrentUser } from '../../common/decorators/company.decorator';
import { UserRole, AttendanceStatus } from '../../common/enums';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ManualCorrectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkIn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkOut?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  status?: AttendanceStatus;

  @ApiProperty()
  @IsString()
  reason: string;
}

@ApiTags('Attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  @Get('daily')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get daily attendance summary' })
  @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'status', required: false, enum: AttendanceStatus })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getDaily(
    @CompanyId() companyId: string,
    @Query('date') date: string,
    @Query('status') status?: AttendanceStatus,
    @Query('employeeId') employeeId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.svc.getDailyAttendance(companyId, {
      date,
      status,
      employeeId,
      page: +page,
      limit: +limit,
    });
  }

  @Get('monthly-report')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Monthly attendance report' })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'employeeId', required: false })
  getMonthlyReport(
    @CompanyId() companyId: string,
    @Query('year') year: number,
    @Query('month') month: number,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.svc.getMonthlyReport(companyId, {
      year: +year,
      month: +month,
      employeeId,
    });
  }

  @Get('summary')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiQuery({ name: 'date', required: true })
  getSummary(@CompanyId() companyId: string, @Query('date') date: string) {
    return this.svc.getDailySummary(companyId, date);
  }

  @Post('process')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Manually trigger attendance processing for a date' })
  processDate(
    @CompanyId() companyId: string,
    @Body('date') date: string,
  ) {
    return this.svc.processLogsForDate(companyId, date);
  }

  @Post('correct/:employeeId/:date')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Manual attendance correction' })
  correct(
    @CompanyId() companyId: string,
    @CurrentUser() user: any,
    @Param('employeeId') employeeId: string,
    @Param('date') date: string,
    @Body() dto: ManualCorrectionDto,
  ) {
    return this.svc.manualCorrection(companyId, employeeId, date, {
      ...dto,
      correctedBy: user.id,
    });
  }
}
