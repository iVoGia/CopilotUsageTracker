import * as vscode from 'vscode';
import type { CapturedTurn } from './types';

const EXPORT_CMD = 'github.copilot.chat.debug.exportAllPromptLogsAsJson';

type CopilotLogEntry = {
  id?: string;
  requestId?: string;
  serverRequestId?: string;
  ourRequestId?: string;
  metadata?: {
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
    model?: string;
    modelId?: string;
  };
  model?: string;
  timestamp?: string;
  durationMs?: number;
};

export type CopilotPollCallbacks = {
  onTurn: (turn: CapturedTurn) => Promise<void>;
  onStatus?: (msg: string) => void;
};

export class CopilotPoller {
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly seen = new Set<string>();
  private available = true;

  constructor(private readonly callbacks: CopilotPollCallbacks) {}

  start(intervalMs: number) {
    this.stop();
    void this.pollOnce();
    this.timer = setInterval(() => void this.pollOnce(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async pollOnce() {
    if (!this.available) return;

    const cmds = await vscode.commands.getCommands(true);
    if (!cmds.includes(EXPORT_CMD)) {
      this.available = false;
      return;
    }

    let raw: unknown;
    try {
      raw = await vscode.commands.executeCommand(EXPORT_CMD);
    } catch {
      return;
    }

    const entries = this.normalizeEntries(raw);
    for (const entry of entries) {
      const turn = this.toTurn(entry);
      if (!turn || this.seen.has(turn.idempotencyKey)) continue;
      this.seen.add(turn.idempotencyKey);
      await this.callbacks.onTurn(turn);
      this.callbacks.onStatus?.(`Copilot auto: ↑${turn.inputTokens} ↓${turn.outputTokens}`);
    }
  }

  private normalizeEntries(raw: unknown): CopilotLogEntry[] {
    if (Array.isArray(raw)) return raw as CopilotLogEntry[];
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.logs)) return obj.logs as CopilotLogEntry[];
      if (Array.isArray(obj.items)) return obj.items as CopilotLogEntry[];
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return this.normalizeEntries(parsed);
      } catch {
        return [];
      }
    }
    return [];
  }

  private toTurn(entry: CopilotLogEntry): CapturedTurn | null {
    const usage = entry.metadata?.usage;
    const inputTokens = usage?.prompt_tokens;
    const outputTokens = usage?.completion_tokens;
    if (inputTokens == null && outputTokens == null) return null;

    const inTok = Math.max(0, inputTokens ?? 0);
    const outTok = Math.max(0, outputTokens ?? 0);
    const requestId =
      entry.requestId ?? entry.serverRequestId ?? entry.ourRequestId ?? entry.id ?? '';
    if (!requestId) return null;

    const model = entry.metadata?.model ?? entry.metadata?.modelId ?? entry.model ?? 'copilot';
    const promptLength = inTok * 4;
    const responseLength = outTok * 4;

    return {
      idempotencyKey: `copilot-debug:${requestId}`,
      provider: 'GitHub Copilot',
      model,
      promptLength,
      responseLength,
      inputTokens: inTok,
      outputTokens: outTok,
      tokenSource: 'copilot-debug',
      success: true,
      durationMs: entry.durationMs,
      occurredAt: entry.timestamp,
    };
  }
}
