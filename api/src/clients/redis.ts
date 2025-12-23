import Redis from 'ioredis';
import { config } from '@config/index';

export default new Redis({
  port: config.Redis.port || 6379,
  host: config.Redis.host || '127.0.0.1',
  password: config.Redis.password || '',
  db: config.Redis.database || 0
});
