export type TokenSource = 'manual' | 'cursor-local' | 'copilot-debug';

export type CapturedTurn = {
  idempotencyKey: string;
  provider: string;
  model: string;
  promptLength: number;
  responseLength: number;
  inputTokens: number;
  outputTokens: number;
  tokenSource: TokenSource;
  success: boolean;
  durationMs?: number;
  occurredAt?: string;
};
