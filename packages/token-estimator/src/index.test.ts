import { describe, expect, it } from 'vitest';
import { ClaudeTokenEstimator } from './claude-estimator';
import { CompositeTokenEstimator } from './index';
import { GeminiTokenEstimator } from './gemini-estimator';
import { GptTokenEstimator } from './gpt-estimator';

describe('GptTokenEstimator', () => {
  const estimator = new GptTokenEstimator();

  it('estimates positive tokens for non-empty input', () => {
    const tokens = estimator.estimateInput({
      provider: 'openai',
      model: 'gpt-4.1',
      charLength: 100,
    });
    expect(tokens).toBeGreaterThan(0);
  });

  it('estimates credits from token counts', () => {
    const credits = estimator.estimateCredits({
      provider: 'openai',
      model: 'gpt-4.1',
      inputTokens: 1000,
      outputTokens: 1000,
    });
    expect(credits).toBe(4);
  });
});

describe('ClaudeTokenEstimator', () => {
  it('uses ~3.5 chars per token', () => {
    const estimator = new ClaudeTokenEstimator();
    expect(
      estimator.estimateInput({ provider: 'anthropic', model: 'claude-sonnet', charLength: 350 }),
    ).toBe(100);
  });
});

describe('GeminiTokenEstimator', () => {
  it('uses ~4 chars per token', () => {
    const estimator = new GeminiTokenEstimator();
    expect(
      estimator.estimateInput({ provider: 'google', model: 'gemini-2.0', charLength: 400 }),
    ).toBe(100);
  });
});

describe('CompositeTokenEstimator', () => {
  it('routes by provider/model family', () => {
    const estimator = new CompositeTokenEstimator();
    const claude = estimator.estimateInput({
      provider: 'Anthropic',
      model: 'Claude Sonnet',
      charLength: 350,
    });
    const gemini = estimator.estimateInput({
      provider: 'Gemini',
      model: 'gemini-pro',
      charLength: 400,
    });
    expect(claude).toBe(100);
    expect(gemini).toBe(100);
  });
});
