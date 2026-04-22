import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'shift_start_time', type: 'time' })
  shiftStartTime: string;

  @Column({ name: 'shift_end_time', type: 'time' })
  shiftEndTime: string;

  @Column({ name: 'grace_minutes', default: 10 })
  graceMinutes: number;

  @Column({ default: false })
  overnight: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, (c) => c.shifts)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
