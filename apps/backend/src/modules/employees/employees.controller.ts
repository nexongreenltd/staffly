import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompanyId } from '../../common/decorators/company.decorator';
import { UserRole, EmployeeStatus } from '../../common/enums';

@ApiTags('Employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly svc: EmployeesService) {}

  @Post()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create employee + push to devices' })
  create(@CompanyId() companyId: string, @Body() dto: CreateEmployeeDto) {
    return this.svc.create(companyId, dto);
  }

  @Get()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: EmployeeStatus })
  @ApiQuery({ name: 'departmentId', required: false })
  findAll(
    @CompanyId() companyId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: EmployeeStatus,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.svc.findAll(companyId, { page: +page, limit: +limit, status, search, departmentId });
  }

  @Get(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.svc.findOne(companyId, id);
  }

  @Patch(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.svc.update(companyId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Deactivate employee and remove from devices' })
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.svc.remove(companyId, id);
  }

  @Get(':id/device-mappings')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  getDeviceMappings(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.svc.getDeviceMappings(companyId, id);
  }
}
