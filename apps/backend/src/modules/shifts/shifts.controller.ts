import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompanyId } from '../../common/decorators/company.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly svc: ShiftsService) {}

  @Post()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  create(@CompanyId() companyId: string, @Body() dto: CreateShiftDto) {
    return this.svc.create(companyId, dto);
  }

  @Get()
  findAll(@CompanyId() companyId: string) {
    return this.svc.findAll(companyId);
  }

  @Get(':id')
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.svc.findOne(companyId, id);
  }

  @Patch(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateShiftDto>,
  ) {
    return this.svc.update(companyId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.svc.remove(companyId, id);
  }
}
