/** Lightweight char-based token estimates for the extension (no tiktoken/WASM). */

type CreditRate = {
  inputCreditsPer1kTokens: number;
  outputCreditsPer1kTokens: number;
};

const RATES: Record<'gpt' | 'claude' | 'gemini' | 'default', CreditRate> = {
  gpt: { inputCreditsPer1kTokens: 1, outputCreditsPer1kTokens: 3 },
  claude: { inputCreditsPer1kTokens: 1.2, outputCreditsPer1kTokens: 3.6 },
  gemini: { inputCreditsPer1kTokens: 0.8, outputCreditsPer1kTokens: 2.4 },
  default: { inputCreditsPer1kTokens: 1, outputCreditsPer1kTokens: 3 },
};

function detectFamily(provider: string, model: string): keyof typeof RATES {
  const p = provider.trim().toLowerCase();
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

function charsPerToken(family: keyof typeof RATES): number {
  switch (family) {
    case 'claude':
      return 3.5;
    case 'gemini':
    case 'gpt':
    case 'default':
      return 4;
  }
}

export function estimateTokens(provider: string, model: string, charLength: number): number {
  if (charLength <= 0) return 0;
  const family = detectFamily(provider, model);
  return Math.max(1, Math.ceil(charLength / charsPerToken(family)));
}

export function estimateCredits(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = RATES[detectFamily(provider, model)];
  return (
    (inputTokens / 1000) * rate.inputCreditsPer1kTokens +
    (outputTokens / 1000) * rate.outputCreditsPer1kTokens
  );
}
