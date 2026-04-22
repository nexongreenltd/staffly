import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../database/entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private deptRepo: Repository<Department>,
  ) {}

  async create(companyId: string, name: string) {
    return this.deptRepo.save({ companyId, name });
  }

  async findAll(companyId: string) {
    return this.deptRepo.find({ where: { companyId }, order: { name: 'ASC' } });
  }

  async findOne(companyId: string, id: string) {
    const dept = await this.deptRepo.findOne({ where: { id, companyId } });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async update(companyId: string, id: string, name: string) {
    await this.findOne(companyId, id);
    await this.deptRepo.update({ id, companyId }, { name });
    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.deptRepo.delete({ id, companyId });
    return { message: 'Department deleted' };
  }
}
