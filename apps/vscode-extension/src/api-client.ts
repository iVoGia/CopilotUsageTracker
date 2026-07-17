import type { UsageEventInput } from './types';

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  developer?: { id: string; displayName: string; role: string };
};

export class ApiClient {
  private token?: string;

  constructor(private readonly getBaseUrl: () => string) {}

  setToken(token: string | undefined) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async devLogin(githubId: string, displayName: string): Promise<TokenResponse> {
    const res = await fetch(`${this.getBaseUrl()}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubId, displayName }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<TokenResponse>;
  }

  async postEvents(events: UsageEventInput[]) {
    return this.authed('POST', '/events', { events });
  }

  async startTask(label: string) {
    return this.authed('POST', '/tasks/start', { label });
  }

  async endTask() {
    return this.authed('POST', '/tasks/end', {});
  }

  private async authed(method: string, path: string, body: unknown) {
    if (!this.token) throw new Error('Not logged in — run Copilot Tracker: Setup');
    const res = await fetch(`${this.getBaseUrl()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}
