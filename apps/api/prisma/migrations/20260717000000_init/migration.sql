-- CreateSchema
CREATE TYPE "Role" AS ENUM ('DEVELOPER', 'LEADER', 'ADMIN');
CREATE TYPE "EventKind" AS ENUM ('CHAT', 'COMPLETION');
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "developers" (
    "id" UUID NOT NULL,
    "github_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'DEVELOPER',
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "developers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "workspace_name" TEXT NOT NULL,
    "git_branch" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "developer_id" UUID NOT NULL,
    "project_id" UUID,
    "status" "SessionStatus" NOT NULL DEFAULT 'OPEN',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prompt_count" INTEGER NOT NULL DEFAULT 0,
    "total_prompt_length" INTEGER NOT NULL DEFAULT 0,
    "total_response_length" INTEGER NOT NULL DEFAULT 0,
    "credits_used" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "developer_id" UUID NOT NULL,
    "project_id" UUID,
    "name" TEXT NOT NULL,
    "jira_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credit_estimation" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "input_credits_per_1k" DOUBLE PRECISION NOT NULL,
    "output_credits_per_1k" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_estimation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "kind" "EventKind" NOT NULL DEFAULT 'CHAT',
    "developer_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "project_id" UUID,
    "task_id" UUID,
    "credit_estimation_id" UUID,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_length" INTEGER NOT NULL,
    "response_length" INTEGER NOT NULL DEFAULT 0,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "estimated_credits" DOUBLE PRECISION NOT NULL,
    "duration_ms" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_code" TEXT,
    "machine_id" TEXT,
    "vscode_version" TEXT,
    "copilot_extension_version" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_statistics" (
    "id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "developer_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_count" INTEGER NOT NULL DEFAULT 0,
    "total_prompt_length" INTEGER NOT NULL DEFAULT 0,
    "total_response_length" INTEGER NOT NULL DEFAULT 0,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "daily_statistics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monthly_statistics" (
    "id" UUID NOT NULL,
    "year_month" TEXT NOT NULL,
    "developer_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_count" INTEGER NOT NULL DEFAULT 0,
    "total_prompt_length" INTEGER NOT NULL DEFAULT 0,
    "total_response_length" INTEGER NOT NULL DEFAULT 0,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "monthly_statistics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "developer_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_label" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "developers_github_id_key" ON "developers"("github_id");
CREATE UNIQUE INDEX "projects_workspace_name_git_branch_key" ON "projects"("workspace_name", "git_branch");
CREATE INDEX "sessions_developer_id_status_last_activity_at_idx" ON "sessions"("developer_id", "status", "last_activity_at");
CREATE INDEX "sessions_last_activity_at_idx" ON "sessions"("last_activity_at");
CREATE INDEX "tasks_developer_id_active_idx" ON "tasks"("developer_id", "active");
CREATE INDEX "tasks_jira_id_idx" ON "tasks"("jira_id");
CREATE UNIQUE INDEX "events_idempotency_key_key" ON "events"("idempotency_key");
CREATE INDEX "events_occurred_at_idx" ON "events"("occurred_at");
CREATE INDEX "events_developer_id_occurred_at_idx" ON "events"("developer_id", "occurred_at");
CREATE INDEX "events_session_id_idx" ON "events"("session_id");
CREATE INDEX "events_task_id_idx" ON "events"("task_id");
CREATE INDEX "events_model_occurred_at_idx" ON "events"("model", "occurred_at");
CREATE INDEX "events_project_id_occurred_at_idx" ON "events"("project_id", "occurred_at");
CREATE UNIQUE INDEX "daily_statistics_day_developer_id_project_id_model_key" ON "daily_statistics"("day", "developer_id", "project_id", "model");
CREATE INDEX "daily_statistics_day_idx" ON "daily_statistics"("day");
CREATE INDEX "daily_statistics_developer_id_day_idx" ON "daily_statistics"("developer_id", "day");
CREATE UNIQUE INDEX "monthly_statistics_year_month_developer_id_project_id_model_key" ON "monthly_statistics"("year_month", "developer_id", "project_id", "model");
CREATE INDEX "monthly_statistics_year_month_idx" ON "monthly_statistics"("year_month");
CREATE INDEX "monthly_statistics_developer_id_year_month_idx" ON "monthly_statistics"("developer_id", "year_month");
CREATE UNIQUE INDEX "credit_estimation_provider_model_version_key" ON "credit_estimation"("provider", "model", "version");
CREATE INDEX "credit_estimation_provider_model_active_idx" ON "credit_estimation"("provider", "model", "active");
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_developer_id_idx" ON "refresh_tokens"("developer_id");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_credit_estimation_id_fkey" FOREIGN KEY ("credit_estimation_id") REFERENCES "credit_estimation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_statistics" ADD CONSTRAINT "daily_statistics_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_statistics" ADD CONSTRAINT "daily_statistics_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "monthly_statistics" ADD CONSTRAINT "monthly_statistics_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "monthly_statistics" ADD CONSTRAINT "monthly_statistics_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
