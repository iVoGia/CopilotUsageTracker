#!/usr/bin/env bash
# One-time macOS local setup without Docker (Homebrew Postgres + Redis).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Copilot Usage Tracker — local setup (no Docker)"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required. Install from https://brew.sh then re-run." >&2
  exit 1
fi

NODE_MAJOR="$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1 || echo 0)"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "Node.js >= 20 required (found: $(node -v 2>/dev/null || echo none))" >&2
  exit 1
fi
echo "✓ Node $(node -v)"

echo "==> Installing PostgreSQL 16 + Redis (idempotent)"
brew list postgresql@16 >/dev/null 2>&1 || brew install postgresql@16
brew list redis >/dev/null 2>&1 || brew install redis

echo "==> Starting services"
brew services start postgresql@16 || true
brew services start redis || true

export PATH="/opt/homebrew/opt/postgresql@16/bin:/usr/local/opt/postgresql@16/bin:$PATH"

# Wait for Postgres
for i in {1..30}; do
  if pg_isready -h localhost -p 5432 -q 2>/dev/null; then
    break
  fi
  sleep 1
done

if ! pg_isready -h localhost -p 5432 -q; then
  echo "PostgreSQL did not become ready. Try: brew services restart postgresql@16" >&2
  exit 1
fi

echo "==> Ensuring role/database ghc"
# Create role if missing (peer/trust local auth on Homebrew default)
if ! psql -h localhost -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='ghc'" | grep -q 1; then
  psql -h localhost -d postgres -c "CREATE ROLE ghc LOGIN PASSWORD 'ghc' SUPERUSER;"
fi
if ! psql -h localhost -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='ghc'" | grep -q 1; then
  psql -h localhost -d postgres -c "CREATE DATABASE ghc OWNER ghc;"
fi
echo "✓ Database ghc ready"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "✓ Created .env from .env.example"
else
  echo "✓ .env already exists"
fi

echo "==> npm install + build packages"
npm install
npm run build:packages

echo "==> Prisma generate + migrate + seed"
export DATABASE_URL="${DATABASE_URL:-postgresql://ghc:ghc@localhost:5432/ghc?schema=public}"
# Load .env DATABASE_URL if set
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a
  # Only export simple KEY=VAL lines
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    export "$line" 2>/dev/null || true
  done < .env
  set +a
fi

npm run prisma:generate -w @ghc/api
npm run prisma:migrate -w @ghc/api
(cd apps/api && npx prisma db seed)

echo ""
echo "Setup complete."
echo "  Next:  npm run dev:local"
echo "  Docs:  docs/local-without-docker.md"
