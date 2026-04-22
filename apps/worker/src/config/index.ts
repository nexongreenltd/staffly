import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'staffly_hrm',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASS || undefined,
  },
  worker: {
    schedulerIntervalMs: parseInt(process.env.SCHEDULER_INTERVAL_MS || '300000', 10), // 5 min
    deviceTimeoutMs: parseInt(process.env.DEVICE_TIMEOUT_MS || '10000', 10),
    maxRetries: parseInt(process.env.MAX_DEVICE_RETRIES || '3', 10),
  },
};
