# OpenAPI

The NestJS API serves interactive OpenAPI at runtime:

- UI: `http://localhost:3001/docs`
- JSON: `http://localhost:3001/docs-json`

## Export

With the API running:

```bash
curl -s http://localhost:3001/docs-json > docs/openapi.json
```

Contract sources of truth for request bodies also live in `packages/shared` (Zod schemas), aligned with the controllers under `apps/api/src`.

## Notable schemas

- `BatchEventsSchema` — `POST /api/events` (strict; no prompt content fields)
- `DashboardFiltersSchema` — query params for dashboard/statistics/credits
- Auth — Bearer JWT on protected routes; WebSocket auth via `handshake.auth.token`
