import type { CreditRate, EstimateCreditsParams, EstimateLengthParams, TokenEstimator } from './types';

const DEFAULT_RATE: CreditRate = {
  inputCreditsPer1kTokens: 1.2,
  outputCreditsPer1kTokens: 3.6,
};

/** Claude approximation: ~3.5 characters per token (Anthropic heuristic). */
export class ClaudeTokenEstimator implements TokenEstimator {
  estimateInput(params: EstimateLengthParams): number {
    return params.charLength <= 0 ? 0 : Math.max(1, Math.ceil(params.charLength / 3.5));
  }

  estimateOutput(params: EstimateLengthParams): number {
    return this.estimateInput(params);
  }

  estimateCredits(params: EstimateCreditsParams & { rate?: CreditRate }): number {
    const rate = params.rate ?? DEFAULT_RATE;
    return (
      (params.inputTokens / 1000) * rate.inputCreditsPer1kTokens +
      (params.outputTokens / 1000) * rate.outputCreditsPer1kTokens
    );
  }
}
