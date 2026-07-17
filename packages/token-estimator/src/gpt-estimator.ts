import { encoding_for_model, type TiktokenModel } from '@dqbd/tiktoken';
import type { EstimateLengthParams, TokenEstimator, EstimateCreditsParams, CreditRate } from './types';

const DEFAULT_RATE: CreditRate = {
  inputCreditsPer1kTokens: 1,
  outputCreditsPer1kTokens: 3,
};

function resolveTiktokenModel(model: string): TiktokenModel {
  const m = model.toLowerCase();
  if (m.includes('gpt-4o')) return 'gpt-4o';
  if (m.includes('gpt-4')) return 'gpt-4';
  if (m.includes('gpt-3.5')) return 'gpt-3.5-turbo';
  return 'gpt-4o';
}

/**
 * GPT path uses tiktoken. Without actual text we approximate tokens from
 * character length using a synthetic ASCII sample of the same length.
 */
export class GptTokenEstimator implements TokenEstimator {
  estimateInput(params: EstimateLengthParams): number {
    return this.estimateFromLength(params.model, params.charLength);
  }

  estimateOutput(params: EstimateLengthParams): number {
    return this.estimateFromLength(params.model, params.charLength);
  }

  estimateCredits(params: EstimateCreditsParams & { rate?: CreditRate }): number {
    const rate = params.rate ?? DEFAULT_RATE;
    return (
      (params.inputTokens / 1000) * rate.inputCreditsPer1kTokens +
      (params.outputTokens / 1000) * rate.outputCreditsPer1kTokens
    );
  }

  private estimateFromLength(model: string, charLength: number): number {
    if (charLength <= 0) return 0;
    try {
      const enc = encoding_for_model(resolveTiktokenModel(model));
      try {
        // Approximate: ~4 chars/token for English; refine with tokenizer on a buffer.
        const sample = 'a'.repeat(Math.min(charLength, 8000));
        const tokensForSample = enc.encode(sample).length;
        const ratio = tokensForSample / sample.length;
        return Math.max(1, Math.ceil(charLength * ratio));
      } finally {
        enc.free();
      }
    } catch {
      return Math.max(1, Math.ceil(charLength / 4));
    }
  }
}
