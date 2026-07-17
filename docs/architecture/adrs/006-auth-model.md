# ADR-006: Auth model

## Status

Accepted

## Context

Three roles need different visibility: Developer (self), Leader (team), Admin (all + config). The VS Code extension and dashboard both need secure identity.

## Decision

- **Dashboard:** GitHub OAuth → short-lived access JWT (+ refresh token stored hashed).
- **Extension:** After OAuth / device login flow, issue a developer-bound **device JWT** (refreshable), scoped to ingest and self-read APIs.
- Roles stored on `developers.role`: `DEVELOPER` | `LEADER` | `ADMIN`.
- WebSocket connections authenticate with the same JWT; rooms are assigned by role.

## Consequences

- **Positive:** Natural identity for Copilot teams; clear RBAC; extension tokens are revocable.
- **Negative:** Requires GitHub OAuth app configuration; device flow UX in the extension.
