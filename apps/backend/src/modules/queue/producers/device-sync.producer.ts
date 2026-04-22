import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QueueName } from '../../../common/enums';

export interface DeviceSyncJobData {
  deviceId: string;
  companyId: string;
  priority?: boolean;
}

export interface PushUserJobData {
  companyId: string;
  employeeId: string;
}

export interface DeleteUserJobData {
  companyId: string;
  employeeId: string;
}

@Injectable()
export class DeviceSyncProducer {
  private readonly logger = new Logger(DeviceSyncProducer.name);

  constructor(
    @InjectQueue(QueueName.DEVICE_SYNC)
    private deviceSyncQueue: Queue,
  ) {}

  async addDeviceSyncJob(deviceId: string, companyId: string, priority = false) {
    const job = await this.deviceSyncQueue.add(
      'sync-device',
      { deviceId, companyId, priority } as DeviceSyncJobData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
        priority: priority ? 1 : 10,
      },
    );
    this.logger.debug(`Queued sync job ${job.id} for device ${deviceId}`);
    return job;
  }

  async addPushUserJob(companyId: string, employeeId: string) {
    const job = await this.deviceSyncQueue.add(
      'push-user',
      { companyId, employeeId } as PushUserJobData,
      {
        attempts: 3,
        backoff: { type: 'fixed', delay: 3000 },
        removeOnComplete: 50,
      },
    );
    this.logger.debug(`Queued push-user job for employee ${employeeId}`);
    return job;
  }

  async addDeleteUserJob(companyId: string, employeeId: string) {
    const job = await this.deviceSyncQueue.add(
      'delete-user',
      { companyId, employeeId } as DeleteUserJobData,
      {
        attempts: 3,
        backoff: { type: 'fixed', delay: 3000 },
      },
    );
    this.logger.debug(`Queued delete-user job for employee ${employeeId}`);
    return job;
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.deviceSyncQueue.getWaitingCount(),
      this.deviceSyncQueue.getActiveCount(),
      this.deviceSyncQueue.getCompletedCount(),
      this.deviceSyncQueue.getFailedCount(),
      this.deviceSyncQueue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }
}
