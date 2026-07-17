# ADR-002: Local + server token estimation

## Status

Accepted

## Context

Token and credit estimates must be consistent, modular across providers (GPT, Claude, Gemini), and resistant to trivial client spoofing of costs.

## Decision

Implement a shared `TokenEstimator` interface in `packages/token-estimator`:

- `estimateInput({ provider, model, charLength })`
- `estimateOutput({ provider, model, charLength })`
- `estimateCredits({ provider, model, inputTokens, outputTokens })`

The extension estimates locally for UX and offline queueing. The API re-runs estimation on received character lengths and stores server values as authoritative.

Adapters:

- GPT: `@dqbd/tiktoken` (or equivalent open-source tokenizer)
- Claude / Gemini: documented character-based approximations behind the same interface

Credit rates come from versioned `credit_estimation` rows.

## Consequences

- **Positive:** Consistent credits; swappable formulas; spoofing of token counts is harder.
- **Negative:** Character length remains extension-trusted; extra CPU on ingest (acceptable at 100k/day).
