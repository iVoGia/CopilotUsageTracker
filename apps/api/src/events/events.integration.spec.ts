/**
 * Integration tests expect DATABASE_URL and REDIS_URL.
 * Run via: docker compose up -d postgres redis && npm run test:integration -w @ghc/api
 */
import { describe, expect, it } from 'vitest';

describe('integration placeholder', () => {
  it('documents required env for full ingest tests', () => {
    expect(process.env.DATABASE_URL ?? 'postgresql://ghc:ghc@localhost:5432/ghc').toContain('postgresql');
  });
});
