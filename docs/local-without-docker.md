# Local without Docker (macOS)

Company machines that block Docker can run the full stack with **Homebrew PostgreSQL + Redis** and Node processes.

## Prerequisites

| Tool | Version |
|------|---------|
| macOS | with [Homebrew](https://brew.sh) |
| Node.js | >= 20 |
| Free ports | `5432` (Postgres), `6379` (Redis), `3000` (dashboard), `3001` (API) |

## One-time setup

From the repo root:

```bash
npm run setup:local
```

This will:

1. Install `postgresql@16` and `redis` via Homebrew (if missing)
2. Start both services
3. Create role/database `ghc` / password `ghc` (matches `.env.example`)
4. Copy `.env.example` → `.env` if needed
5. `npm install`, build packages, Prisma migrate + seed

## Every day

```bash
npm run check:local   # optional preflight
npm run dev:local     # API + worker + dashboard together
```

Then open:

- Dashboard: http://localhost:3000 — click **Dev login**
- API / OpenAPI: http://localhost:3001/docs
- Health: http://localhost:3001/api/health

## Troubleshooting

### PostgreSQL not ready

```bash
brew services restart postgresql@16
pg_isready -h localhost -p 5432
```

If `pg_isready` is missing from PATH:

```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
```

### Redis not responding

```bash
brew services restart redis
redis-cli ping   # expect PONG
```

### Port already in use

```bash
lsof -i :3000 -i :3001 -i :5432 -i :6379
```

Stop the conflicting process or change `PORT` / Next port in `.env`.

### Migrate / auth failures

Confirm `.env` has:

```env
DATABASE_URL=postgresql://ghc:ghc@localhost:5432/ghc?schema=public
REDIS_URL=redis://localhost:6379
```

Reset DB (destructive — local only):

```bash
psql -h localhost -d postgres -c "DROP DATABASE IF EXISTS ghc;"
psql -h localhost -d postgres -c "CREATE DATABASE ghc OWNER ghc;"
npm run prisma:migrate -w @ghc/api
(cd apps/api && npx prisma db seed)
```

### Homebrew services blocked by IT

Use alternatives without changing app code:

| Service | Alternative |
|---------|-------------|
| Postgres | [Postgres.app](https://postgresapp.com) or cloud (Neon, Supabase) → set `DATABASE_URL` |
| Redis | Cloud (Upstash) → set `REDIS_URL` |

Then still run:

```bash
npm run build:packages
npm run prisma:generate -w @ghc/api
npm run prisma:migrate -w @ghc/api
npm run dev:local
```

(`check:local` may fail if cloud hosts are not `localhost` — start processes manually with `npm run dev:api`, `npm run dev:worker`, `npm run dev:dashboard`.)

### Seed credit rates again

```bash
(cd apps/api && npx prisma db seed)
```
