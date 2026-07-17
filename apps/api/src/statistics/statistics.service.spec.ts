import { describe, expect, it } from 'vitest';
import { StatisticsService } from './statistics.service';

describe('StatisticsService.resolveRange', () => {
  const service = new StatisticsService({} as never);

  it('resolves 7d window', () => {
    const { from, to } = service.resolveRange({ range: '7d' });
    expect(to.getTime()).toBeGreaterThanOrEqual(from.getTime());
    const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThanOrEqual(6);
    expect(days).toBeLessThan(8);
  });
});
