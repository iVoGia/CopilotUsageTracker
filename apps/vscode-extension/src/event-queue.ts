import type { UsageEventInput } from './types';
import type { ApiClient } from './api-client';

export class EventQueue {
  private buffer: UsageEventInput[] = [];

  constructor(private readonly api: ApiClient) {}

  async enqueue(event: UsageEventInput) {
    this.buffer.push(event);
    if (this.buffer.length >= 20) {
      await this.flush();
    }
  }

  async flush() {
    if (!this.buffer.length) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      await this.api.postEvents(batch);
    } catch (err) {
      this.buffer.unshift(...batch);
      throw err;
    }
  }
}
