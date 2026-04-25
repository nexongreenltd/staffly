import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeavesService } from './leaves.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompanyId, CurrentUser } from '../../common/decorators/company.decorator';
import { UserRole, LeaveType, LeaveStatus } from '../../common/enums';

class CreateLeaveDto {
  @ApiProperty({ example: '2025-05-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-05-03' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: LeaveType, default: LeaveType.CASUAL })
  @IsEnum(LeaveType)
  leaveType: LeaveType;

  @ApiProperty()
  @IsString()
  reason: string;
}

class ReviewLeaveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

@ApiTags('Leaves')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('leaves')
export class LeavesController {
  constructor(private readonly svc: LeavesService) {}

  @Post()
  @Roles(UserRole.EMPLOYEE, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Submit a leave request' })
  create(@CurrentUser() user: any, @CompanyId() companyId: string, @Body() dto: CreateLeaveDto) {
    const employeeId = user.employeeId;
    return this.svc.create(companyId, employeeId, dto);
  }

  @Get()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'List all leave requests (admin)' })
  @ApiQuery({ name: 'status', required: false, enum: LeaveStatus })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CompanyId() companyId: string,
    @Query('status') status?: LeaveStatus,
    @Query('employeeId') employeeId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 30,
  ) {
    return this.svc.findAll(companyId, { status, employeeId, page: +page, limit: +limit });
  }

  @Get('my')
  @Roles(UserRole.EMPLOYEE, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get my leave requests' })
  @ApiQuery({ name: 'page', required: false })
  findMine(
    @CurrentUser() user: any,
    @CompanyId() companyId: string,
    @Query('page') page = 1,
  ) {
    return this.svc.findMine(companyId, user.employeeId, +page);
  }

  @Patch(':id/approve')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Approve a leave request' })
  approve(
    @CompanyId() companyId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
  ) {
    return this.svc.approve(companyId, id, user.id, dto.reviewNote);
  }

  @Patch(':id/reject')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Reject a leave request' })
  reject(
    @CompanyId() companyId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
  ) {
    return this.svc.reject(companyId, id, user.id, dto.reviewNote);
  }

  @Delete(':id')
  @Roles(UserRole.EMPLOYEE, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Cancel my pending leave request' })
  cancel(@CurrentUser() user: any, @CompanyId() companyId: string, @Param('id') id: string) {
    return this.svc.cancel(companyId, id, user.employeeId);
  }
}
