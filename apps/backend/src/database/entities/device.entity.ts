import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { DeviceStatus } from '../../common/enums';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ name: 'ip_address', length: 45 })
  ipAddress: string;

  @Column({ default: 4370 })
  port: number;

  @Column({ length: 200, nullable: true })
  location: string;

  @Column({ length: 100, default: 'ZKTeco K40' })
  model: string;

  @Column({ name: 'serial_number', length: 100, nullable: true })
  serialNumber: string;

  @Column({ name: 'firmware_version', length: 50, nullable: true })
  firmwareVersion: string;

  @Column({ type: 'varchar', length: 30, default: DeviceStatus.INACTIVE })
  status: DeviceStatus;

  @Column({ name: 'last_synced_at', nullable: true, type: 'timestamptz' })
  lastSyncedAt: Date;

  @Column({ name: 'last_error', nullable: true, type: 'text' })
  lastError: string;

  @Column({ name: 'sync_interval', default: 5 })
  syncInterval: number;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, (c) => c.devices)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
