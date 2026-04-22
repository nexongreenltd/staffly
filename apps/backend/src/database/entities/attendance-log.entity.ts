import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, Index,
} from 'typeorm';
import { Company } from './company.entity';
import { Employee } from './employee.entity';
import { Device } from './device.entity';

@Entity('attendance_logs')
@Index(['deviceId', 'deviceUserId', 'punchTime'], { unique: true })
export class AttendanceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'device_id' })
  deviceId: string;

  @Column({ name: 'employee_id', nullable: true })
  employeeId: string;

  @Column({ name: 'device_user_id' })
  deviceUserId: number;

  @Column({ name: 'punch_time', type: 'timestamptz' })
  punchTime: Date;

  @Column({ name: 'punch_type', default: 0 })
  punchType: number;

  @Column({ name: 'verify_type', default: 1 })
  verifyType: number;

  @Column({ name: 'raw_record', type: 'jsonb', nullable: true })
  rawRecord: object;

  @Column({ name: 'is_processed', default: false })
  isProcessed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Device)
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}
