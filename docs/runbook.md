# Runbook

## Install from GitHub Release

See **[install-from-release.md](./install-from-release.md)** and **[pilot-option-c.md](./pilot-option-c.md)** (Option C — VSIX + local API).

## Local without Docker

On macOS company machines (Docker banned), use Homebrew Postgres + Redis:

See **[local-without-docker.md](./local-without-docker.md)** and root README section *Local without Docker*.

```bash
npm run setup:local   # once
npm run dev:local     # daily
```

## Services

| Service | Port | Role |
|---------|------|------|
| postgres | 5432 | Primary store |
| redis | 6379 | Realtime pub/sub |
| api | 3001 | REST + WebSocket |
| worker | — | Closes sessions after 30m inactivity |
| dashboard | 3000 | UI |

## Health

```bash
curl -sf http://localhost:3001/api/health
```

## Common operations

### Rotate JWT secret

1. Set new `JWT_SECRET` on `api` and `worker`.
2. Restart services — clients must re-login (refresh tokens remain valid until expiry/revoke).

### Seed / update Copilot AI credit rates

Rates are **USD per 1M tokens** from [GitHub Copilot models and pricing](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing).  
`AI credits = costUSD / 0.01`. Cursor events do not consume these credits.

```bash
cd apps/api && npx prisma db seed
```

Or insert versioned rows into `credit_estimation` and mark older versions `active = false`.

### Close stuck sessions manually

Sessions auto-close via worker. To force:

```sql
UPDATE sessions
SET status = 'CLOSED', ended_at = NOW()
WHERE status = 'OPEN' AND last_activity_at < NOW() - INTERVAL '30 minutes';
```

### Backups

Backup PostgreSQL volume / use `pg_dump`. Redis is ephemeral (pubsub only).

## Performance notes

- Dashboard Overview reads `daily_statistics` — keep filters on indexed columns.
- If `POST /events` p99 exceeds 200ms, move rollup upserts to an outbox worker (see ADR-005).

## Incident: realtime not updating

1. Check Redis health (`redis-cli ping` or cloud console).
2. Confirm API can publish (`REDIS_URL`).
3. Confirm dashboard `NEXT_PUBLIC_WS_URL` and JWT on socket auth.
4. Leaders/Admins join `team` room; Developers only receive their own room.
