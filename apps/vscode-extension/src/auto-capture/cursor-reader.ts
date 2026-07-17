import { execFile } from 'child_process';
import { homedir, platform } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type ComposerHeader = {
  composerId: string;
  workspaceId: string;
  lastUpdatedAt: number;
  value: Record<string, unknown>;
};

export type ConversationHeader = {
  bubbleId: string;
  type: number;
  createdAt?: string;
  grouping?: { isRenderable?: boolean; capabilityType?: number };
};

export type ComposerSnapshot = {
  composerId: string;
  modelName: string;
  inputTokens: number;
  generating: boolean;
  headers: ConversationHeader[];
  workspacePath?: string;
};

export type BubbleSnapshot = {
  bubbleId: string;
  composerId: string;
  type: number;
  text: string;
  createdAt?: string;
  requestId?: string;
};

export function cursorGlobalDbPath(): string {
  const home = homedir();
  switch (platform()) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    case 'win32':
      return join(process.env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    default:
      return join(home, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
  }
}

async function queryJson(dbPath: string, sql: string): Promise<unknown[]> {
  try {
    const { stdout } = await execFileAsync('sqlite3', ['-json', dbPath, sql], {
      maxBuffer: 32 * 1024 * 1024,
    });
    const trimmed = stdout.trim();
    if (!trimmed) return [];
    return JSON.parse(trimmed) as unknown[];
  } catch {
    return [];
  }
}

function parseJsonValue(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return null;
}

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

export async function listRecentComposers(dbPath: string, sinceMs: number): Promise<ComposerHeader[]> {
  const rows = (await queryJson(
    dbPath,
    `SELECT composerId, workspaceId, lastUpdatedAt, value FROM composerHeaders WHERE lastUpdatedAt >= ${sinceMs} ORDER BY lastUpdatedAt DESC LIMIT 50`,
  )) as Array<Record<string, unknown>>;

  return rows
    .map((row) => {
      const value = parseJsonValue(row.value) ?? {};
      return {
        composerId: String(row.composerId ?? ''),
        workspaceId: String(row.workspaceId ?? ''),
        lastUpdatedAt: Number(row.lastUpdatedAt ?? 0),
        value,
      };
    })
    .filter((h) => h.composerId);
}

export async function loadComposerSnapshot(dbPath: string, composerId: string): Promise<ComposerSnapshot | null> {
  const rows = (await queryJson(
    dbPath,
    `SELECT value FROM cursorDiskKV WHERE key = 'composerData:${sqlEscape(composerId)}' LIMIT 1`,
  )) as Array<{ value?: string }>;
  if (!rows.length) return null;

  const data = parseJsonValue(rows[0].value);
  if (!data) return null;

  const breakdown = (data.promptTokenBreakdown ?? {}) as Record<string, unknown>;
  const modelConfig = (data.modelConfig ?? {}) as Record<string, unknown>;
  const workspaceIdentifier = (data.workspaceIdentifier ?? {}) as Record<string, unknown>;
  const uri = (workspaceIdentifier.uri ?? {}) as Record<string, unknown>;

  const headers = Array.isArray(data.fullConversationHeadersOnly)
    ? (data.fullConversationHeadersOnly as ConversationHeader[])
    : [];

  const generatingIds = data.generatingBubbleIds;
  const generating = Array.isArray(generatingIds) && generatingIds.length > 0;

  return {
    composerId,
    modelName: String(modelConfig.modelName ?? 'default'),
    inputTokens: Number(breakdown.totalUsedTokens ?? 0),
    generating,
    headers,
    workspacePath: typeof uri.fsPath === 'string' ? uri.fsPath : typeof uri.path === 'string' ? uri.path : undefined,
  };
}

export async function loadBubble(dbPath: string, composerId: string, bubbleId: string): Promise<BubbleSnapshot | null> {
  const key = `bubbleId:${composerId}:${bubbleId}`;
  const rows = (await queryJson(
    dbPath,
    `SELECT value FROM cursorDiskKV WHERE key = '${sqlEscape(key)}' LIMIT 1`,
  )) as Array<{ value?: string }>;
  if (!rows.length) return null;

  const data = parseJsonValue(rows[0].value);
  if (!data) return null;

  return {
    bubbleId,
    composerId,
    type: Number(data.type ?? 0),
    text: typeof data.text === 'string' ? data.text : '',
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
    requestId: typeof data.requestId === 'string' ? data.requestId : undefined,
  };
}
