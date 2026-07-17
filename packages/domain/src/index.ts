export enum Role {
  DEVELOPER = 'DEVELOPER',
  LEADER = 'LEADER',
  ADMIN = 'ADMIN',
}

export enum EventKind {
  CHAT = 'CHAT',
  COMPLETION = 'COMPLETION',
}

export enum SessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export const SESSION_INACTIVITY_MS = 30 * 60 * 1000;

export const FORBIDDEN_EVENT_FIELDS = [
  'prompt',
  'promptContent',
  'content',
  'code',
  'sourceCode',
  'messages',
  'message',
  'completion',
  'text',
  'body',
] as const;

export function assertNoForbiddenFields(payload: Record<string, unknown>): void {
  for (const key of FORBIDDEN_EVENT_FIELDS) {
    if (key in payload) {
      throw new Error(`Forbidden field "${key}" — prompt/code content must never leave the developer machine`);
    }
  }
}

export function shouldCloseSession(
  lastActivityAt: Date,
  now: Date = new Date(),
  inactivityMs: number = SESSION_INACTIVITY_MS,
): boolean {
  return now.getTime() - lastActivityAt.getTime() >= inactivityMs;
}

export function canViewDeveloper(
  viewerRole: Role,
  viewerId: string,
  targetDeveloperId: string,
): boolean {
  if (viewerRole === Role.ADMIN || viewerRole === Role.LEADER) {
    return true;
  }
  return viewerId === targetDeveloperId;
}

export function parseTaskLabel(input: string): { jiraId?: string; name: string } {
  const trimmed = input.trim();
  const jiraMatch = trimmed.match(/^([A-Z][A-Z0-9]+-\d+)(?:\s+(.+))?$/i);
  if (jiraMatch) {
    return {
      jiraId: jiraMatch[1].toUpperCase(),
      name: (jiraMatch[2] ?? jiraMatch[1]).trim(),
    };
  }
  return { name: trimmed };
}
