import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../common/guards/jwt-auth.guard';

const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  @Public()
  @Get()
  async health() {
    let dbOk = false;
    try {
      await this.ds.query('SELECT 1');
      dbOk = true;
    } catch (_) {}

    return {
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: { database: dbOk ? 'up' : 'down' },
    };
  }
}
