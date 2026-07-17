# Copilot Usage Tracker

Privacy-first analytics for **GitHub Copilot Chat** usage on a development team (20–100 people).

**Never uploads prompt text or source code** — only metadata (lengths, model, task, timing).

Repository: [https://github.com/iVoGia/CopilotUsageTracker](https://github.com/iVoGia/CopilotUsageTracker)

---

## Quick start on company Mac (no Docker)

Prerequisites: **Node.js ≥ 20**, [Homebrew](https://brew.sh), free ports `5432` / `6379` / `3000` / `3001`.

```bash
# 1. Clone
git clone https://github.com/iVoGia/CopilotUsageTracker.git
cd CopilotUsageTracker

# 2. One-time: Postgres + Redis + migrate + seed
npm run setup:local

# 3. Start API + worker + dashboard
npm run dev:local
```

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| API / OpenAPI | http://localhost:3001/docs |
| Health | http://localhost:3001/api/health |

Open the dashboard → click **Dev login**.

Troubleshoot: [docs/local-without-docker.md](docs/local-without-docker.md) · Vietnamese checklist: [docs/install-from-release.md](docs/install-from-release.md)

---

## Install the Cursor / VS Code extension from Release

1. Open [Releases](https://github.com/iVoGia/CopilotUsageTracker/releases) → latest → download **`copilot-usage-tracker-*.vsix`**
2. Cursor or VS Code → Extensions → `…` → **Install from VSIX…** → select the file
3. Command Palette → **Copilot Tracker: Setup**
   - API URL: `http://localhost:3001/api`
   - GitHub ID + display name (pilot login)

Or build locally:

```bash
npm run extension:package
# → apps/vscode-extension/copilot-usage-tracker-1.0.0.vsix
```

---

## Daily use

| Command | What it does |
|---------|----------------|
| **Copilot Tracker: Setup** | API URL + login |
| **Start Task** | e.g. `ABC-123` or `Login Refactor` |
| **End Task** | Clear current task |
| **Record Chat Turn** | Pick model → enter **character lengths only** (never paste prompt text) |
| **Flush Events** | Force upload queue |

Status bar: `GHC: Sign in` · `GHC: ABC-123` · `GHC: offline`

After recording a turn, refresh the dashboard (or wait for live update) — prompts/credits should increase.

---

## Verify

```bash
curl -sf http://localhost:3001/api/health
```

Sample event (optional):

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/dev-login \
  -H 'Content-Type: application/json' \
  -d '{"githubId":"leader-1","displayName":"Team Leader","role":"LEADER"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

curl -X POST http://localhost:3001/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "events": [{
      "idempotencyKey": "demo-event-001",
      "provider": "OpenAI",
      "model": "gpt-4.1",
      "promptLength": 120,
      "responseLength": 400,
      "success": true,
      "project": { "workspaceName": "demo", "gitBranch": "main" },
      "environment": { "machineId": "dev-machine-1" }
    }]
  }'
```

---

## Cài nhanh (tiếng Việt)

1. `git clone https://github.com/iVoGia/CopilotUsageTracker.git && cd CopilotUsageTracker`
2. `npm run setup:local` rồi `npm run dev:local`
3. Mở http://localhost:3000 → **Dev login**
4. Tải VSIX từ [Releases](https://github.com/iVoGia/CopilotUsageTracker/releases) → cài **Install from VSIX**
5. **Copilot Tracker: Setup** → Start Task → Record Chat Turn

Chi tiết: [docs/install-from-release.md](docs/install-from-release.md)

---

## Optional: Docker Compose

Only if Docker is allowed:

```bash
cp .env.example .env
docker compose up --build
```

---

## Architecture

```
VS Code Extension → REST API (NestJS) → PostgreSQL
                         ↓
                      Redis pub/sub → WebSocket → Next.js Dashboard
```

Docs: [docs/architecture/README.md](docs/architecture/README.md)

| Path | Package |
|------|---------|
| `apps/api` | NestJS API + WebSocket + session worker |
| `apps/dashboard` | Next.js dashboard |
| `apps/vscode-extension` | Metadata capture extension |
| `packages/*` | domain, shared, token-estimator |

### Roles

| Role | Visibility |
|------|------------|
| Developer | Own usage |
| Leader | Team usage |
| Admin | Everything |

### Main API

`POST /api/events` · `GET /api/dashboard` · `POST /api/tasks/start` · OpenAPI at `/docs`

---

## Releasing (maintainers)

```bash
# After changes are on main:
npm test
npm run extension:package   # optional local check

git tag -a v1.0.1 -m "v1.0.1"
git push origin v1.0.1
```

Pushing a `v*` tag runs [`.github/workflows/release.yml`](.github/workflows/release.yml): builds the VSIX and publishes a GitHub Release with the asset attached.

Manual release (if CI is unavailable):

```bash
npm run extension:package
gh release create v1.0.0 ./apps/vscode-extension/copilot-usage-tracker-1.0.0.vsix \
  --title "v1.0.0" \
  --notes "See README Quick Start."
```

---

## Privacy

- Forbidden fields (`prompt`, `content`, `code`, …) are rejected.
- No prompt/content columns in the database — see [docs/architecture/database.md](docs/architecture/database.md).

## Operations

[docs/runbook.md](docs/runbook.md) · [docs/local-without-docker.md](docs/local-without-docker.md)
