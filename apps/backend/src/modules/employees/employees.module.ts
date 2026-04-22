import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { Employee } from '../../database/entities/employee.entity';
import { User } from '../../database/entities/user.entity';
import { DeviceEmployeeMap } from '../../database/entities/device-employee-map.entity';
import { UsersModule } from '../users/users.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, User, DeviceEmployeeMap]),
    UsersModule,
    QueueModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
