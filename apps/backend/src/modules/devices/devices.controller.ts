import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto, UpdateDeviceDto } from './dto/create-device.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompanyId } from '../../common/decorators/company.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly svc: DevicesService) {}

  @Post()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Register a new biometric device' })
  create(@CompanyId() companyId: string, @Body() dto: CreateDeviceDto) {
    return this.svc.create(companyId, dto);
  }

  @Get()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  findAll(@CompanyId() companyId: string) {
    return this.svc.findAll(companyId);
  }

  @Get(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.svc.findOne(companyId, id);
  }

  @Get(':id/stats')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  getStats(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.svc.getDeviceStats(companyId, id);
  }

  @Patch(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.svc.update(companyId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.svc.remove(companyId, id);
  }

  @Post('sync')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Trigger sync on all enabled company devices' })
  syncAll(@CompanyId() companyId: string) {
    return this.svc.triggerSyncAll(companyId);
  }

  @Post(':id/sync')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Trigger sync on a specific device' })
  syncOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.svc.triggerSync(companyId, id);
  }
}
