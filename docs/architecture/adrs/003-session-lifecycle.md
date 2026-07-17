# ADR-003: Hybrid session lifecycle

## Status

Accepted

## Context

Prompts should group into sessions for dashboards (duration, prompt count, avg sizes, credits). VS Code may sleep or disconnect, so client-only sessions drift.

## Decision

- A session opens on the first prompt (or explicit `POST /session/start`).
- A session closes on explicit `POST /session/end` or after **30 minutes** without events.
- A background worker periodically closes inactive open sessions (server is source of truth).
- A new event after close opens a new session (or attaches to an open session if still within the inactivity window).

## Consequences

- **Positive:** Accurate session boundaries even when the IDE sleeps.
- **Negative:** Requires a worker process; brief race windows around the inactivity boundary.
