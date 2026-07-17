#!/usr/bin/env bash
# Start API + worker + dashboard locally (no Docker).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/check-local-deps.sh"

echo "==> Building shared packages + Prisma client"
npm run build:packages
npm run prisma:generate -w @ghc/api

# Load .env for child processes
if [[ -f .env ]]; then
  set -a
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    export "$line" 2>/dev/null || true
  done < .env
  set +a
fi

echo ""
echo "Starting local stack:"
echo "  Dashboard  http://localhost:3000"
echo "  API docs   http://localhost:3001/docs"
echo "  Health     http://localhost:3001/api/health"
echo "  Ctrl+C to stop all"
echo ""

npx concurrently \
  --names "api,worker,dash" \
  --prefix-colors "cyan,magenta,green" \
  --kill-others-on-fail \
  "npm run start:dev -w @ghc/api" \
  "npm run start:dev:worker -w @ghc/api" \
  "npm run dev -w @ghc/dashboard"
