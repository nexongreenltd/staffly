import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { Shift } from './shift.entity';
import { EmployeeStatus, BiometricStatus } from '../../common/enums';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'department_id', nullable: true })
  departmentId: string;

  @Column({ name: 'shift_id', nullable: true })
  shiftId: string;

  @Column({ name: 'employee_code', length: 50 })
  employeeCode: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 30, nullable: true })
  phone: string;

  @Column({ length: 150, nullable: true })
  designation: string;

  @Column({ name: 'joining_date', type: 'date', nullable: true })
  joiningDate: string;

  @Column({ type: 'varchar', length: 30, default: EmployeeStatus.ACTIVE })
  status: EmployeeStatus;

  @Column({
    name: 'biometric_status',
    type: 'varchar',
    length: 30,
    default: BiometricStatus.PENDING,
  })
  biometricStatus: BiometricStatus;

  @Column({ name: 'face_id', length: 100, nullable: true })
  faceId: string;

  @Column({ name: 'card_number', length: 100, nullable: true })
  cardNumber: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, (c) => c.employees)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Shift, { nullable: true })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
