# ADR-002: Token estimation + GitHub Copilot AI Credits

## Status

Accepted (updated 2026-07-18)

## Context

Teams need two distinct signals:

1. **Tokens consumed per prompt** — accurate usage cost for Cursor and Copilot chat turns.
2. **GitHub Copilot AI Credits** — because Copilot plans limit by AI credits (usage-based billing).

The old heuristic `(tokens/1000) × 1/3` did **not** match GitHub Copilot billing.

## Decision

### Tokens (primary)

- Store `inputTokens` / `outputTokens` on every event.
- Auto-capture sources may supply authoritative counts (`tokenSource: cursor-local | copilot-debug`).
- API re-estimates from character length only for manual events without client tokens.

### Credits (GitHub Copilot only)

Official formula ([Models and pricing](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing)):

```text
costUSD =
  (inputTokens / 1e6) × usdPer1MInput
+ (cachedInputTokens / 1e6) × usdPer1MCachedInput
+ (cacheWriteTokens / 1e6) × usdPer1MCacheWrite
+ (outputTokens / 1e6) × usdPer1MOutput

AI_credits = costUSD / 0.01   // 1 AI credit = $0.01
```

Rates live in versioned `credit_estimation` rows (USD per 1M tokens).

Credits are computed **only** when the event is GitHub Copilot (`tokenSource=copilot-debug` or provider matches Copilot/GitHub). **Cursor events always get `estimatedCredits = 0`.**

Unknown Copilot models → credits = 0 (no legacy 1/3 fallback).

## Consequences

- **Positive:** Tokens stay comparable across Cursor/Copilot; Credits align with Copilot plan limits.
- **Negative:** Cached tokens often unavailable → under-estimate slightly vs GitHub invoice; must refresh seed when GitHub updates prices.
