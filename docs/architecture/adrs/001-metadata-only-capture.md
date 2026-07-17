# ADR-001: Metadata-only capture

## Status

Accepted

## Context

Engineering leaders need Copilot usage insights without violating developer privacy or uploading proprietary source code.

## Decision

Never capture, transmit, or persist prompt text or source code. The VS Code extension and API accept only metadata (lengths, estimates, model, timing, identity, project/task identifiers).

The API rejects requests that include forbidden fields (`prompt`, `content`, `code`, `messages`, etc.). The database schema has no content columns.

## Consequences

- **Positive:** Strong privacy posture; easier legal/security review; smaller payloads.
- **Negative:** Cannot audit prompt wording quality by reading content; must rely on length distributions and process coaching outside this system.
