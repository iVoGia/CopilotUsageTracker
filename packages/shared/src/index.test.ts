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

  it('accepts auto-capture token metadata', () => {
    const parsed = BatchEventsSchema.parse({
      events: [
        {
          idempotencyKey: 'cursor-local:abc:u1:a1',
          provider: 'Cursor',
          model: 'grok-4.5',
          promptLength: 100,
          responseLength: 500,
          estimatedInputTokens: 12000,
          estimatedOutputTokens: 800,
          tokenSource: 'cursor-local',
        },
      ],
    });
    expect(parsed.events[0].tokenSource).toBe('cursor-local');
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
