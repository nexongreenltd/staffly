import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SuperadminService } from './superadmin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

@ApiTags('Superadmin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
@ApiBearerAuth()
@Controller('superadmin')
export class SuperadminController {
  constructor(private readonly svc: SuperadminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'System-wide stats across all tenants' })
  getStats() {
    return this.svc.getSystemStats();
  }

  @Get('companies')
  @ApiOperation({ summary: 'All companies with per-company stats' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  getCompanies(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.svc.getCompaniesWithStats(+page, +limit, search);
  }

  @Get('companies/:id')
  @ApiOperation({ summary: 'Single company detail with devices, admins, stats' })
  getCompany(@Param('id') id: string) {
    return this.svc.getCompanyDetail(id);
  }

  @Patch('companies/:id/toggle')
  @ApiOperation({ summary: 'Activate or deactivate a company' })
  toggleCompany(@Param('id') id: string) {
    return this.svc.toggleCompany(id);
  }

  @Post('companies/:id/reset-password')
  @ApiOperation({ summary: 'Reset the company admin password' })
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.svc.resetAdminPassword(id, dto.newPassword);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Recent system activity' })
  getActivity(@Query('limit') limit = 10) {
    return this.svc.getRecentActivity(+limit);
  }
}
