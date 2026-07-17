/** Minimal event shape for the extension bundle (avoids shipping full Zod at runtime). */
export type UsageEventInput = {
  idempotencyKey: string;
  kind: 'CHAT' | 'COMPLETION';
  provider: string;
  model: string;
  promptLength: number;
  responseLength: number;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  estimatedCredits?: number;
  durationMs?: number;
  success: boolean;
  errorCode?: string;
  project?: { workspaceName: string; gitBranch?: string };
  environment?: {
    machineId: string;
    vscodeVersion?: string;
    copilotExtensionVersion?: string;
  };
};
