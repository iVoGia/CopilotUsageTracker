#!/usr/bin/env bash
# Preflight: Postgres + Redis must be reachable for local (non-Docker) dev.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "✗ $1" >&2
  if [[ -n "${2:-}" ]]; then
    echo "  Fix: $2" >&2
  fi
  exit 1
}

ok() {
  echo "✓ $1"
}

# Prefer Homebrew postgres@16 binaries when present
export PATH="/opt/homebrew/opt/postgresql@16/bin:/usr/local/opt/postgresql@16/bin:$PATH"

if ! command -v pg_isready >/dev/null 2>&1; then
  fail "pg_isready not found" "Run: npm run setup:local   (or brew install postgresql@16)"
fi

if ! command -v redis-cli >/dev/null 2>&1; then
  fail "redis-cli not found" "Run: npm run setup:local   (or brew install redis)"
fi

if ! pg_isready -h localhost -p 5432 -q; then
  fail "PostgreSQL is not accepting connections on localhost:5432" \
    "brew services start postgresql@16"
fi
ok "PostgreSQL ready on :5432"

if ! redis-cli -h 127.0.0.1 -p 6379 ping 2>/dev/null | grep -q PONG; then
  fail "Redis is not responding on localhost:6379" \
    "brew services start redis"
fi
ok "Redis ready on :6379"

if [[ ! -f .env ]]; then
  echo "⚠ .env missing — copying from .env.example"
  cp .env.example .env
fi
ok "Local dependencies look good"
