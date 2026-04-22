import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Employee } from './employee.entity';
import { Device } from './device.entity';
import { Shift } from './shift.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 30, nullable: true })
  phone: string;

  @Column({ nullable: true, type: 'text' })
  address: string;

  @Column({ name: 'logo_url', nullable: true, type: 'text' })
  logoUrl: string;

  @Column({ length: 60, default: 'UTC' })
  timezone: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ length: 30, default: 'trial' })
  subscription: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => User, (u) => u.company)
  users: User[];

  @OneToMany(() => Employee, (e) => e.company)
  employees: Employee[];

  @OneToMany(() => Device, (d) => d.company)
  devices: Device[];

  @OneToMany(() => Shift, (s) => s.company)
  shifts: Shift[];
}
