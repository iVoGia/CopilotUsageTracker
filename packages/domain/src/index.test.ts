import { describe, expect, it } from 'vitest';
import {
  assertNoForbiddenFields,
  canViewDeveloper,
  parseTaskLabel,
  Role,
  shouldCloseSession,
  SESSION_INACTIVITY_MS,
} from './index';

describe('assertNoForbiddenFields', () => {
  it('allows metadata-only payloads', () => {
    expect(() =>
      assertNoForbiddenFields({ promptLength: 120, model: 'gpt-4.1' }),
    ).not.toThrow();
  });

  it('rejects prompt content fields', () => {
    expect(() => assertNoForbiddenFields({ prompt: 'secret' })).toThrow(/Forbidden field/);
  });
});

describe('shouldCloseSession', () => {
  it('closes after 30 minutes inactivity', () => {
    const last = new Date('2026-01-01T10:00:00Z');
    const now = new Date(last.getTime() + SESSION_INACTIVITY_MS);
    expect(shouldCloseSession(last, now)).toBe(true);
  });

  it('keeps open within window', () => {
    const last = new Date('2026-01-01T10:00:00Z');
    const now = new Date(last.getTime() + SESSION_INACTIVITY_MS - 1);
    expect(shouldCloseSession(last, now)).toBe(false);
  });
});

describe('canViewDeveloper', () => {
  it('allows self for developers', () => {
    expect(canViewDeveloper(Role.DEVELOPER, 'a', 'a')).toBe(true);
    expect(canViewDeveloper(Role.DEVELOPER, 'a', 'b')).toBe(false);
  });

  it('allows leaders and admins', () => {
    expect(canViewDeveloper(Role.LEADER, 'a', 'b')).toBe(true);
    expect(canViewDeveloper(Role.ADMIN, 'a', 'b')).toBe(true);
  });
});

describe('parseTaskLabel', () => {
  it('extracts jira id', () => {
    expect(parseTaskLabel('ABC-123 Login Refactor')).toEqual({
      jiraId: 'ABC-123',
      name: 'Login Refactor',
    });
  });

  it('uses free-text name', () => {
    expect(parseTaskLabel('Payment Bug')).toEqual({ name: 'Payment Bug' });
  });
});
