import * as vscode from 'vscode';
import {
  cursorGlobalDbPath,
  listRecentComposers,
  loadBubble,
  loadComposerSnapshot,
  type ConversationHeader,
} from './cursor-reader';
import type { CapturedTurn } from './types';
import { estimateTokens } from '../token-estimate';

const BUBBLE_TYPE_USER = 1;
const BUBBLE_TYPE_ASSISTANT = 2;

function workspacePaths(): string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);
}

function matchesWorkspace(composerPath: string | undefined, paths: string[]): boolean {
  if (!composerPath || !paths.length) return true;
  return paths.some((p) => composerPath === p || composerPath.startsWith(p + '/'));
}

function formatK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export type CursorPollCallbacks = {
  onTurn: (turn: CapturedTurn) => Promise<void>;
  onStatus?: (msg: string) => void;
};

export class CursorPoller {
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly seenTurns = new Set<string>();
  private readonly processedHeaders = new Map<string, number>();
  private lastPollMs = Date.now() - 60 * 60 * 1000;
  private dbAvailable = true;

  constructor(private readonly callbacks: CursorPollCallbacks) {}

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
    if (!this.dbAvailable) return;

    const dbPath = cursorGlobalDbPath();
    const paths = workspacePaths();
    const sinceMs = this.lastPollMs;
    this.lastPollMs = Date.now();

    let composers = await listRecentComposers(dbPath, sinceMs - 5000);
    if (!composers.length) {
      composers = await listRecentComposers(dbPath, Date.now() - 2 * 60 * 60 * 1000);
    }

    for (const header of composers) {
      const snapshot = await loadComposerSnapshot(dbPath, header.composerId);
      if (!snapshot || snapshot.generating) continue;
      if (!matchesWorkspace(snapshot.workspacePath, paths)) continue;

      const turns = await this.extractTurns(dbPath, snapshot.composerId, snapshot.headers, snapshot);
      for (const turn of turns) {
        if (this.seenTurns.has(turn.idempotencyKey)) continue;
        this.seenTurns.add(turn.idempotencyKey);
        await this.callbacks.onTurn(turn);
        this.callbacks.onStatus?.(
          `Auto: ↑${formatK(turn.inputTokens)} ↓${formatK(turn.outputTokens)} (${turn.model})`,
        );
      }
    }
  }

  private async extractTurns(
    dbPath: string,
    composerId: string,
    headers: ConversationHeader[],
    snapshot: { modelName: string; inputTokens: number },
  ): Promise<CapturedTurn[]> {
    const startIdx = this.processedHeaders.get(composerId) ?? 0;
    const turns: CapturedTurn[] = [];
    let lastProcessed = startIdx;

    for (let i = startIdx; i < headers.length; i++) {
      const h = headers[i];
      if (h.type !== BUBBLE_TYPE_USER) continue;

      const userBubble = await loadBubble(dbPath, composerId, h.bubbleId);
      if (!userBubble || !userBubble.text.trim()) continue;

      const assistant = await this.findAssistantAfter(headers, i, dbPath, composerId);
      if (!assistant) continue;

      const turnKey = `cursor-local:${composerId}:${h.bubbleId}:${assistant.bubbleId}`;
      if (this.seenTurns.has(turnKey)) {
        lastProcessed = i + 1;
        continue;
      }

      const provider = 'Cursor';
      const model = snapshot.modelName || 'default';
      const promptLength = userBubble.text.length;
      const responseLength = assistant.text.length;
      const inputTokens = snapshot.inputTokens > 0 ? snapshot.inputTokens : estimateTokens(provider, model, promptLength);
      const outputTokens =
        assistant.text.length > 0
          ? estimateTokens(provider, model, responseLength)
          : 0;

      if (inputTokens <= 0 && outputTokens <= 0) continue;

      turns.push({
        idempotencyKey: turnKey,
        provider,
        model,
        promptLength,
        responseLength,
        inputTokens,
        outputTokens: Math.max(outputTokens, responseLength > 0 ? 1 : 0),
        tokenSource: 'cursor-local',
        success: true,
        occurredAt: assistant.createdAt ?? userBubble.createdAt,
      });
      lastProcessed = i + 1;
    }

    if (lastProcessed > startIdx) {
      this.processedHeaders.set(composerId, lastProcessed);
    }
    return turns;
  }

  private async findAssistantAfter(
    headers: ConversationHeader[],
    userIdx: number,
    dbPath: string,
    composerId: string,
  ) {
    for (let j = userIdx + 1; j < headers.length; j++) {
      const h = headers[j];
      if (h.type !== BUBBLE_TYPE_ASSISTANT) continue;
      const bubble = await loadBubble(dbPath, composerId, h.bubbleId);
      if (!bubble) continue;
      if (bubble.text.trim().length > 0) return bubble;
      // Skip tool-only bubbles without visible text
      if (h.grouping?.capabilityType === 15) continue;
    }
    return null;
  }

  markUnavailable() {
    this.dbAvailable = false;
    this.callbacks.onStatus?.('Cursor auto-capture unavailable (sqlite3 or DB path)');
  }
}
