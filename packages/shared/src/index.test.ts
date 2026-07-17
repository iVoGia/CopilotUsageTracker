import { describe, expect, it } from 'vitest';
import { BatchEventsSchema } from './index';

describe('BatchEventsSchema', () => {
  it('accepts metadata-only events', () => {
    const parsed = BatchEventsSchema.parse({
      events: [
        {
          idempotencyKey: 'abc12345',
          provider: 'OpenAI',
          model: 'gpt-4.1',
          promptLength: 10,
          responseLength: 20,
        },
      ],
    });
    expect(parsed.events).toHaveLength(1);
  });

  it('rejects unknown content fields (strict)', () => {
    expect(() =>
      BatchEventsSchema.parse({
        events: [
          {
            idempotencyKey: 'abc12345',
            provider: 'OpenAI',
            model: 'gpt-4.1',
            promptLength: 10,
            prompt: 'secret',
          },
        ],
      }),
    ).toThrow();
  });
});
