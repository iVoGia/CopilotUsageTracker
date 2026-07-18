-- GitHub Copilot AI Credits: store USD per 1M tokens (1 AI credit = $0.01)

ALTER TABLE "credit_estimation" RENAME COLUMN "input_credits_per_1k" TO "usd_per_1m_input";
ALTER TABLE "credit_estimation" RENAME COLUMN "output_credits_per_1k" TO "usd_per_1m_output";

ALTER TABLE "credit_estimation" ADD COLUMN "usd_per_1m_cached_input" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "credit_estimation" ADD COLUMN "usd_per_1m_cache_write" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "credit_estimation" ADD COLUMN "long_context_threshold" INTEGER;

-- Detach events from legacy rates, then clear heuristic rows (re-seed with official Copilot pricing)
UPDATE "events" SET "credit_estimation_id" = NULL;
DELETE FROM "credit_estimation";
