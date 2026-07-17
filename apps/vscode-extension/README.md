# Copilot Usage Tracker (VS Code / Cursor)

Privacy-first extension: logs **metadata only** (lengths, model, task).  
**Never** uploads prompt text or source code.

Pilot guide (Option C): [docs/pilot-option-c.md](../../docs/pilot-option-c.md) in the monorepo.

## Install

1. Download `copilot-usage-tracker-*.vsix` from [GitHub Releases](https://github.com/iVoGia/CopilotUsageTracker/releases) (Private repo — need Collaborator access), **or** build:

```bash
npm run extension:package
```

2. Cursor / VS Code → Extensions → `…` → **Install from VSIX…**
3. Command Palette → **Copilot Tracker: Setup**

### API URL

| Environment | `ghc.apiBaseUrl` |
|-------------|------------------|
| **Pilot (same Mac)** | `http://localhost:3001/api` |
| **Internal / shared API** | e.g. `https://tracker.congty.internal/api` |

Operator must be running the stack (`npm run operator:start`) before Setup / Record works on localhost.

## Commands

| Command | Purpose |
|---------|---------|
| **Setup** | API URL + pilot login (first run) |
| **Start Task** | Attach usage to `ABC-123` or a free-text name |
| **End Task** | Clear current task |
| **Record Chat Turn** | Pick model → enter prompt/response **character lengths** |
| **Flush Events** | Force upload the local queue |

## Status bar

| Text | Meaning |
|------|---------|
| `GHC: Sign in` | Run Setup |
| `GHC: <task>` | Logged in with active task |
| `GHC: offline` | API unreachable or last request failed (tooltip has detail) |

## Settings

- `ghc.apiBaseUrl` — default `http://localhost:3001/api` (pilot); change for shared internal API
- `ghc.githubId` / `ghc.displayName` — pilot identity

## Privacy

Do **not** paste prompt or completion text into the length fields — numbers only.
