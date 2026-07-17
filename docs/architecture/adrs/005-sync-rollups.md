# ADR-005: Sync rollups on write

## Status

Accepted

## Context

Overview and credit dashboards must load in under 1 second. Scanning raw events for every dashboard load will not meet that target at 100k events/day growth.

## Decision

On each successful event ingest (same transaction when practical):

1. Insert append-only `events` row.
2. Upsert `daily_statistics` and `monthly_statistics` counters.

If p99 ingest latency exceeds 200ms under load, upgrade to a transactional outbox + async worker without changing the rollup schema.

## Consequences

- **Positive:** Simple; Overview reads are O(days × dimensions), not O(events).
- **Negative:** Slightly heavier write path; outbox needed if write latency becomes an issue.
