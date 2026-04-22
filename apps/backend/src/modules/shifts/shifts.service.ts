import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shift } from '../../database/entities/shift.entity';
import { CreateShiftDto } from './dto/create-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepo: Repository<Shift>,
  ) {}

  async create(companyId: string, dto: CreateShiftDto) {
    if (dto.isDefault) {
      await this.shiftRepo.update({ companyId, isDefault: true }, { isDefault: false });
    }
    const shift = this.shiftRepo.create({ companyId, ...dto });
    return this.shiftRepo.save(shift);
  }

  async findAll(companyId: string) {
    return this.shiftRepo.find({
      where: { companyId },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async findOne(companyId: string, id: string) {
    const shift = await this.shiftRepo.findOne({ where: { id, companyId } });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async update(companyId: string, id: string, dto: Partial<CreateShiftDto>) {
    if (dto.isDefault) {
      await this.shiftRepo.update({ companyId, isDefault: true }, { isDefault: false });
    }
    await this.findOne(companyId, id);
    await this.shiftRepo.update({ id, companyId }, dto as any);
    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.shiftRepo.delete({ id, companyId });
    return { message: 'Shift deleted' };
  }
}
