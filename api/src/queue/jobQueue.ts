import Queue, { JobOptions } from 'bull';
import { config } from '@config/index';

export const jobQueue = new Queue('jobQueue', {
  redis: {
      port: config.Redis.port || 6379,
      host: config.Redis.host,
      password: config.Redis.password,
      db: 11,
    },
});

export const addJob = async <T = any>(name: string, data: T, options?: JobOptions) => {
  await jobQueue.add(name, data, options);
  console.log(`[Bull] Job added: ${name}`);
};
