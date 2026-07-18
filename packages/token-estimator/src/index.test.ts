import { describe, expect, it } from 'vitest';
import { ClaudeTokenEstimator } from './claude-estimator';
import {
  CompositeTokenEstimator,
  estimateCopilotAiCredits,
  isGitHubCopilotEvent,
} from './index';
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

describe('estimateCopilotAiCredits', () => {
  const rates = [
    {
      model: 'claude-sonnet-4.5',
      usdPer1MInput: 3,
      usdPer1MCachedInput: 0.3,
      usdPer1MCacheWrite: 3.75,
      usdPer1MOutput: 15,
    },
  ];

  it('uses official USD/1M → AI credit ($0.01) formula', () => {
    // (1000/1e6)*3 + (500/1e6)*15 = 0.003 + 0.0075 = 0.0105 USD → 1.05 credits
    const credits = estimateCopilotAiCredits({
      model: 'claude-sonnet-4.5',
      inputTokens: 1000,
      outputTokens: 500,
      rates,
    });
    expect(credits).toBeCloseTo(1.05, 6);
  });

  it('returns 0 when model is unknown', () => {
    expect(
      estimateCopilotAiCredits({
        model: 'unknown-model',
        inputTokens: 1000,
        outputTokens: 100,
        rates,
      }),
    ).toBe(0);
  });
});

describe('isGitHubCopilotEvent', () => {
  it('detects copilot sources', () => {
    expect(isGitHubCopilotEvent('GitHub Copilot', 'copilot-debug')).toBe(true);
    expect(isGitHubCopilotEvent('Cursor', 'cursor-local')).toBe(false);
    expect(isGitHubCopilotEvent('Cursor', undefined)).toBe(false);
  });
});
