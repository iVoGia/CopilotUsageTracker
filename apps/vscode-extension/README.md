# Copilot Usage Tracker (VS Code / Cursor)

Privacy-first extension: logs **metadata only** (lengths, model, task).  
**Never** uploads prompt text or source code.

## Install

From the monorepo root (API should be running):

```bash
npm run extension:package
```

In Cursor or VS Code:

1. Extensions → `…` → **Install from VSIX…**
2. Choose `copilot-usage-tracker-1.0.0.vsix` in this folder
3. Command Palette → **Copilot Tracker: Setup**

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

- `ghc.apiBaseUrl` — default `http://localhost:3001/api`
- `ghc.githubId` / `ghc.displayName` — pilot identity

## Privacy

Do **not** paste prompt or completion text into the length fields — numbers only.
