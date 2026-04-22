import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompanyId } from '../../common/decorators/company.decorator';
import { UserRole } from '../../common/enums';
import { IsString, IsNotEmpty } from 'class-validator';

class CreateDeptDto {
  @IsString() @IsNotEmpty() name: string;
}

@ApiTags('Departments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly svc: DepartmentsService) {}

  @Post()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  create(@CompanyId() companyId: string, @Body() dto: CreateDeptDto) {
    return this.svc.create(companyId, dto.name);
  }

  @Get()
  findAll(@CompanyId() companyId: string) {
    return this.svc.findAll(companyId);
  }

  @Patch(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: CreateDeptDto,
  ) {
    return this.svc.update(companyId, id, dto.name);
  }

  @Delete(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.svc.remove(companyId, id);
  }
}
