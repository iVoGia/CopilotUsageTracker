import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REALTIME_CHANNEL, type RealtimeUsagePayload } from '@ghc/shared';

@Injectable()
export class RealtimePublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimePublisher.name);
  private publisher?: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.publisher = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    this.publisher.connect().catch((err) => {
      this.logger.warn(`Redis publisher connect failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.publisher?.quit();
  }

  async publishUsageEvent(payload: RealtimeUsagePayload) {
    try {
      await this.publisher?.publish(REALTIME_CHANNEL, JSON.stringify(payload));
    } catch (err) {
      this.logger.warn(`Failed to publish realtime event: ${(err as Error).message}`);
    }
  }
}
