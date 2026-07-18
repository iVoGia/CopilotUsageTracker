/** GitHub Copilot AI Credits: 1 credit = $0.01 USD (official usage-based billing). */
export const AI_CREDIT_USD = 0.01;

export type CopilotUsdRate = {
  model: string;
  usdPer1MInput: number;
  usdPer1MCachedInput: number;
  usdPer1MCacheWrite: number;
  usdPer1MOutput: number;
  longContextThreshold?: number | null;
  /** Alternate row for long-context tier (same logical model). */
  longContextRate?: Omit<CopilotUsdRate, 'longContextRate' | 'longContextThreshold'>;
};

export type EstimateCopilotAiCreditsParams = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  /** Rates from credit_estimation (and optional long-context sibling). */
  rates: CopilotUsdRate[];
};

export function normalizeModelKey(model: string): string {
  return model
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9.\-+]/g, '');
}

/** Pick best matching rate row for a model name (substring / normalized equality). */
export function findCopilotRate(model: string, rates: CopilotUsdRate[]): CopilotUsdRate | undefined {
  const key = normalizeModelKey(model);
  if (!key || !rates.length) return undefined;

  const exact = rates.find((r) => normalizeModelKey(r.model) === key);
  if (exact) return exact;

  // Prefer longest model name that is contained in the request model (or vice versa)
  const scored = rates
    .map((r) => {
      const rk = normalizeModelKey(r.model);
      if (key.includes(rk) || rk.includes(key)) {
        return { r, score: Math.min(key.length, rk.length) };
      }
      return null;
    })
    .filter((x): x is { r: CopilotUsdRate; score: number } => x != null)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.r;
}

/**
 * Official GitHub Copilot formula:
 * costUSD = sum(tokens/1e6 * usdPer1M…); AI_credits = costUSD / 0.01
 */
export function estimateCopilotAiCredits(params: EstimateCopilotAiCreditsParams): number {
  const rate = findCopilotRate(params.model, params.rates);
  if (!rate) return 0;

  let active = rate;
  if (
    rate.longContextThreshold != null &&
    params.inputTokens > rate.longContextThreshold &&
    rate.longContextRate
  ) {
    active = { ...rate.longContextRate, model: rate.longContextRate.model };
  } else if (
    rate.longContextThreshold != null &&
    params.inputTokens > rate.longContextThreshold
  ) {
    // Look for explicit *-long sibling in the rate list
    const longSibling = params.rates.find(
      (r) =>
        normalizeModelKey(r.model) === `${normalizeModelKey(rate.model)}-long` ||
        normalizeModelKey(r.model) === `${normalizeModelKey(rate.model)}.long`,
    );
    if (longSibling) active = longSibling;
  }

  const input = Math.max(0, params.inputTokens);
  const output = Math.max(0, params.outputTokens);
  const cached = Math.max(0, params.cachedInputTokens ?? 0);
  const cacheWrite = Math.max(0, params.cacheWriteTokens ?? 0);

  const costUsd =
    (input / 1_000_000) * active.usdPer1MInput +
    (cached / 1_000_000) * active.usdPer1MCachedInput +
    (cacheWrite / 1_000_000) * active.usdPer1MCacheWrite +
    (output / 1_000_000) * active.usdPer1MOutput;

  return costUsd / AI_CREDIT_USD;
}

export function isGitHubCopilotEvent(provider: string, tokenSource?: string): boolean {
  if (tokenSource === 'copilot-debug') return true;
  if (tokenSource === 'cursor-local') return false;
  return /copilot|github/i.test(provider) && !/^cursor$/i.test(provider.trim());
}
