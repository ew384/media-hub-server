import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      url: `redis://:${process.env.REDIS_PASSWORD || ''}@${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}/${process.env.REDIS_DB || 0}`,
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Redis connected');
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.disconnect();
    this.logger.log('❌ Redis disconnected');
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    return this.client.setEx(key, seconds, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }
}
