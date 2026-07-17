export type EstimateLengthParams = {
  provider: string;
  model: string;
  charLength: number;
};

export type EstimateCreditsParams = {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export type CreditRate = {
  inputCreditsPer1kTokens: number;
  outputCreditsPer1kTokens: number;
};

export interface TokenEstimator {
  estimateInput(params: EstimateLengthParams): number;
  estimateOutput(params: EstimateLengthParams): number;
  estimateCredits(params: EstimateCreditsParams & { rate?: CreditRate }): number;
}

export function normalizeProvider(provider: string): string {
  return provider.trim().toLowerCase();
}

export function detectFamily(provider: string, model: string): 'gpt' | 'claude' | 'gemini' | 'default' {
  const p = normalizeProvider(provider);
  const m = model.toLowerCase();
  if (p.includes('openai') || p.includes('gpt') || m.includes('gpt') || m.includes('o1') || m.includes('o3')) {
    return 'gpt';
  }
  if (p.includes('anthropic') || p.includes('claude') || m.includes('claude')) {
    return 'claude';
  }
  if (p.includes('google') || p.includes('gemini') || m.includes('gemini')) {
    return 'gemini';
  }
  return 'default';
}
