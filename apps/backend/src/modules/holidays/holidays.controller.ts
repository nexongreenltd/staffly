import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HolidaysService } from './holidays.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompanyId } from '../../common/decorators/company.decorator';
import { UserRole } from '../../common/enums';

class CreateHolidayDto {
  @ApiProperty({ example: '2025-04-14' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Eid ul-Fitr' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

@ApiTags('Holidays')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('holidays')
export class HolidaysController {
  constructor(private readonly svc: HolidaysService) {}

  @Post()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Declare a company holiday' })
  create(@CompanyId() companyId: string, @Body() dto: CreateHolidayDto) {
    return this.svc.create(companyId, dto);
  }

  @Get()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'List holidays for a year' })
  @ApiQuery({ name: 'year', required: false })
  findAll(
    @CompanyId() companyId: string,
    @Query('year') year?: number,
  ) {
    return this.svc.findAll(companyId, year ? +year : new Date().getFullYear());
  }

  @Delete(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Delete a holiday' })
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.svc.remove(companyId, id);
  }
}
