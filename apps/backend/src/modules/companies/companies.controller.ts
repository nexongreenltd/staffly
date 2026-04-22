import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/create-company.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../common/guards/jwt-auth.guard';

const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@ApiTags('Companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly svc: CompaniesService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Register new company (public)' })
  create(@Body() dto: CreateCompanyDto) {
    return this.svc.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'List all companies (superadmin)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.findAll(+page, +limit);
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/toggle')
  @Roles(UserRole.SUPERADMIN)
  toggle(@Param('id') id: string) {
    return this.svc.toggleActive(id);
  }
}
