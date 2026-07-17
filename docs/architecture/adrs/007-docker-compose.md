# ADR-007: Docker Compose deployment

## Status

Accepted

## Context

The system must be easy to deploy for a single team of 20–100 developers without requiring a full Kubernetes platform.

## Decision

Ship production-oriented Docker Compose with services:

- `api` (NestJS, includes WS gateway)
- `worker` (session inactivity closer)
- `dashboard` (Next.js)
- `postgres`
- `redis`

Healthchecks, named volumes, and `.env.example` are part of the deliverable. Kubernetes is deferred.

## Consequences

- **Positive:** One-command local/staging deploy; matches team size.
- **Negative:** Limited horizontal orchestration features vs K8s (acceptable for v1).
