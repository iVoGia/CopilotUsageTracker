import { describe, expect, it } from 'vitest';
import { SessionsService } from './sessions.service';

describe('SessionsService.summarize', () => {
  const service = new SessionsService({} as never);

  it('computes averages and duration', () => {
    const summary = service.summarize({
      startedAt: new Date('2026-01-01T10:00:00Z'),
      endedAt: new Date('2026-01-01T11:00:00Z'),
      lastActivityAt: new Date('2026-01-01T11:00:00Z'),
      promptCount: 4,
      totalPromptLength: 400,
      totalResponseLength: 800,
      creditsUsed: 2.5,
    });
    expect(summary.durationMs).toBe(3_600_000);
    expect(summary.averagePromptSize).toBe(100);
    expect(summary.averageResponseSize).toBe(200);
    expect(summary.creditsUsed).toBe(2.5);
  });
});
