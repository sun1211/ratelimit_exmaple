// config/redis.config.ts
import Redis from 'ioredis';

let redisClient: Redis;

export const getRedisConnection = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    });

    redisClient.on('connect', () => {
      console.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  return redisClient;
};