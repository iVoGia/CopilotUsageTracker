import { ClaudeTokenEstimator } from './claude-estimator';
import { GeminiTokenEstimator } from './gemini-estimator';
import { GptTokenEstimator } from './gpt-estimator';
import { detectFamily, type CreditRate, type EstimateCreditsParams, type EstimateLengthParams, type TokenEstimator } from './types';

export * from './types';
export { GptTokenEstimator } from './gpt-estimator';
export { ClaudeTokenEstimator } from './claude-estimator';
export { GeminiTokenEstimator } from './gemini-estimator';
export {
  AI_CREDIT_USD,
  estimateCopilotAiCredits,
  findCopilotRate,
  isGitHubCopilotEvent,
  normalizeModelKey,
  type CopilotUsdRate,
  type EstimateCopilotAiCreditsParams,
} from './copilot-credits';

const gpt = new GptTokenEstimator();
const claude = new ClaudeTokenEstimator();
const gemini = new GeminiTokenEstimator();

function pick(provider: string, model: string): TokenEstimator {
  switch (detectFamily(provider, model)) {
    case 'gpt':
      return gpt;
    case 'claude':
      return claude;
    case 'gemini':
      return gemini;
    default:
      return gpt;
  }
}

/** Registry facade implementing TokenEstimator for all supported families. */
export class CompositeTokenEstimator implements TokenEstimator {
  estimateInput(params: EstimateLengthParams): number {
    return pick(params.provider, params.model).estimateInput(params);
  }

  estimateOutput(params: EstimateLengthParams): number {
    return pick(params.provider, params.model).estimateOutput(params);
  }

  /** @deprecated Prefer estimateCopilotAiCredits for GitHub Copilot AI Credits. */
  estimateCredits(params: EstimateCreditsParams & { rate?: CreditRate }): number {
    return pick(params.provider, params.model).estimateCredits(params);
  }
}

export const defaultTokenEstimator = new CompositeTokenEstimator();
