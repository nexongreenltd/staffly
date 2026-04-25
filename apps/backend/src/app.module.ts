import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DevicesModule } from './modules/devices/devices.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { QueueModule } from './modules/queue/queue.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { HealthModule } from './modules/health/health.module';
import { SuperadminModule } from './modules/superadmin/superadmin.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { LeavesModule } from './modules/leaves/leaves.module';

import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { Company } from './database/entities/company.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('DB_HOST', 'localhost'),
        port: cfg.get<number>('DB_PORT', 5432),
        username: cfg.get('DB_USER', 'postgres'),
        password: cfg.get('DB_PASS', 'postgres'),
        database: cfg.get('DB_NAME', 'terraprime_hrm'),
        autoLoadEntities: true,
        synchronize: cfg.get('DB_SYNC', 'false') === 'true',
        logging: cfg.get('DB_LOGGING', 'false') === 'true',
        ssl: cfg.get('DB_SSL', 'false') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        redis: {
          host: cfg.get('REDIS_HOST', 'localhost'),
          port: cfg.get<number>('REDIS_PORT', 6379),
          password: cfg.get('REDIS_PASS', undefined),
        },
      }),
    }),

    TypeOrmModule.forFeature([Company]),
    AuthModule,
    CompaniesModule,
    UsersModule,
    EmployeesModule,
    DevicesModule,
    ShiftsModule,
    AttendanceModule,
    QueueModule,
    DepartmentsModule,
    HealthModule,
    SuperadminModule,
    HolidaysModule,
    LeavesModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'api/v1/auth/(.*)', method: RequestMethod.ALL },
        { path: 'api/v1/companies', method: RequestMethod.POST },
        { path: 'api/v1/superadmin/(.*)', method: RequestMethod.ALL },
        { path: 'api/v1/health', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
