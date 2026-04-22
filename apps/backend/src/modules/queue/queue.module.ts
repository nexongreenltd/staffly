import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DeviceSyncProducer } from './producers/device-sync.producer';
import { QueueName } from '../../common/enums';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QueueName.DEVICE_SYNC },
      { name: QueueName.ATTENDANCE_PROCESS },
    ),
  ],
  providers: [DeviceSyncProducer],
  exports: [DeviceSyncProducer, BullModule],
})
export class QueueModule {}
