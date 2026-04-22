import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Device } from './device.entity';
import { Employee } from './employee.entity';

@Entity('device_employee_map')
@Unique(['deviceId', 'deviceUserId'])
@Unique(['deviceId', 'employeeId'])
export class DeviceEmployeeMap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'device_id' })
  deviceId: string;

  @Column({ name: 'employee_id' })
  employeeId: string;

  @Column({ name: 'device_user_id' })
  deviceUserId: number;

  @Column({ name: 'synced_at', nullable: true, type: 'timestamptz' })
  syncedAt: Date;

  @ManyToOne(() => Device)
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}
