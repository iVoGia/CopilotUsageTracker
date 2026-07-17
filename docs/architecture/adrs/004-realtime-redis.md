# ADR-004: Redis pub/sub for realtime

## Status

Accepted

## Context

The dashboard must update automatically without refresh when new usage events arrive. Expected load is ~100k events/day (~1–2/sec average, higher bursts) with multiple API instances possible.

## Decision

Use Redis pub/sub:

1. After a successful ingest, the API publishes a domain event (e.g. `usage.event.created`).
2. The NestJS WebSocket gateway subscribes and fans out to rooms: `team`, `developer:{id}`.
3. Clients authenticate with JWT on connect; room membership follows RBAC.

Alternatives rejected for v1: PostgreSQL LISTEN/NOTIFY (weaker multi-instance fan-out), Kafka (ops overhead), polling-only (not true realtime).

## Consequences

- **Positive:** Fast fan-out; Compose-friendly; scales to multi-instance API.
- **Negative:** Extra infrastructure dependency (Redis).
