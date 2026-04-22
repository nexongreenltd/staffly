import {
  Injectable, NotFoundException, Logger, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../database/entities/device.entity';
import { DeviceEmployeeMap } from '../../database/entities/device-employee-map.entity';
import { CreateDeviceDto, UpdateDeviceDto } from './dto/create-device.dto';
import { DeviceStatus } from '../../common/enums';
import { DeviceSyncProducer } from '../queue/producers/device-sync.producer';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device)
    private deviceRepo: Repository<Device>,
    @InjectRepository(DeviceEmployeeMap)
    private mapRepo: Repository<DeviceEmployeeMap>,
    private syncProducer: DeviceSyncProducer,
  ) {}

  async create(companyId: string, dto: CreateDeviceDto) {
    const device = this.deviceRepo.create({
      companyId,
      name: dto.name,
      ipAddress: dto.ipAddress,
      port: dto.port || 4370,
      location: dto.location,
      model: dto.model || 'ZKTeco K40',
      syncInterval: dto.syncInterval || 5,
      status: DeviceStatus.INACTIVE,
    });
    await this.deviceRepo.save(device);
    this.logger.log(`Device created: ${device.name} @ ${device.ipAddress}`);
    return device;
  }

  async findAll(companyId: string) {
    return this.deviceRepo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(companyId: string, id: string) {
    const device = await this.deviceRepo.findOne({ where: { id, companyId } });
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  async update(companyId: string, id: string, dto: UpdateDeviceDto) {
    await this.findOne(companyId, id);
    await this.deviceRepo.update({ id, companyId }, dto as any);
    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.deviceRepo.delete({ id, companyId });
    return { message: 'Device removed' };
  }

  async triggerSync(companyId: string, deviceId: string) {
    const device = await this.findOne(companyId, deviceId);
    if (!device.isEnabled) throw new BadRequestException('Device is disabled');
    await this.syncProducer.addDeviceSyncJob(deviceId, companyId, true);
    return { message: 'Sync job queued', deviceId };
  }

  async triggerSyncAll(companyId: string) {
    const devices = await this.deviceRepo.find({
      where: { companyId, isEnabled: true },
    });
    for (const d of devices) {
      await this.syncProducer.addDeviceSyncJob(d.id, companyId, true);
    }
    return { message: `${devices.length} sync jobs queued` };
  }

  async getDeviceStats(companyId: string, deviceId: string) {
    const device = await this.findOne(companyId, deviceId);
    const mappedCount = await this.mapRepo.count({ where: { deviceId } });
    return { device, mappedEmployees: mappedCount };
  }

  async updateStatus(deviceId: string, status: DeviceStatus, error?: string) {
    await this.deviceRepo.update(deviceId, {
      status,
      lastError: error || null,
      ...(status === DeviceStatus.ACTIVE ? { lastSyncedAt: new Date() } : {}),
    });
  }
}
