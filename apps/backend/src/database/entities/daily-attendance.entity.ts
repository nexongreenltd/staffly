import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { Company } from './company.entity';
import { Employee } from './employee.entity';
import { Shift } from './shift.entity';
import { AttendanceStatus } from '../../common/enums';

@Entity('daily_attendance')
@Unique(['companyId', 'employeeId', 'date'])
export class DailyAttendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'employee_id' })
  employeeId: string;

  @Column({ name: 'shift_id', nullable: true })
  shiftId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'check_in', nullable: true, type: 'timestamptz' })
  checkIn: Date;

  @Column({ name: 'check_out', nullable: true, type: 'timestamptz' })
  checkOut: Date;

  @Column({ name: 'working_hours', type: 'numeric', precision: 5, scale: 2, nullable: true })
  workingHours: number;

  @Column({ name: 'late_minutes', default: 0 })
  lateMinutes: number;

  @Column({ name: 'early_out_min', default: 0 })
  earlyOutMin: number;

  @Column({ name: 'overtime_min', default: 0 })
  overtimeMin: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: AttendanceStatus.ABSENT,
  })
  status: AttendanceStatus;

  @Column({ name: 'is_manual', default: false })
  isManual: boolean;

  @Column({ name: 'manual_reason', nullable: true, type: 'text' })
  manualReason: string;

  @Column({ name: 'corrected_by', nullable: true })
  correctedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Shift, { nullable: true })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;
}
