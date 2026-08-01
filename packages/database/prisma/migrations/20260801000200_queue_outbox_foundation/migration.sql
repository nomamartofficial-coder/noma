-- DEV-005 Redis/BullMQ and transactional-outbox reliability foundation.
-- Additive only: PostgreSQL remains authoritative and Redis remains delivery infrastructure.

CREATE TYPE "outbox_status" AS ENUM ('PENDING', 'DISPATCHED', 'PROCESSED', 'DEAD_LETTERED');
CREATE TYPE "job_execution_status" AS ENUM ('PROCESSING', 'RETRYABLE_FAILURE', 'COMPLETED', 'DEAD_LETTERED');
CREATE TYPE "job_attempt_status" AS ENUM ('STARTED', 'RETRYABLE_FAILURE', 'PERMANENT_FAILURE', 'COMPLETED');
CREATE TYPE "attention_owner" AS ENUM ('OPERATIONS', 'FINANCE', 'SECURITY');
CREATE TYPE "attention_status" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(160) NOT NULL,
    "event_version" INTEGER NOT NULL,
    "queue_name" VARCHAR(80) NOT NULL,
    "job_name" VARCHAR(160) NOT NULL,
    "job_version" INTEGER NOT NULL,
    "aggregate_type" VARCHAR(100) NOT NULL,
    "aggregate_id" VARCHAR(200) NOT NULL,
    "aggregate_version" BIGINT NOT NULL,
    "institution_id" UUID,
    "scope_type" VARCHAR(80),
    "scope_id" VARCHAR(200),
    "payload" JSONB NOT NULL,
    "privacy_classification" VARCHAR(40) NOT NULL,
    "service_principal" VARCHAR(120) NOT NULL,
    "correlation_id" VARCHAR(200) NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "available_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "outbox_status" NOT NULL DEFAULT 'PENDING',
    "lease_owner" VARCHAR(160),
    "lease_expires_at" TIMESTAMPTZ(6),
    "dispatch_attempts" INTEGER NOT NULL DEFAULT 0,
    "dispatched_at" TIMESTAMPTZ(6),
    "processed_at" TIMESTAMPTZ(6),
    "dead_lettered_at" TIMESTAMPTZ(6),
    "attention_owner" "attention_owner",
    "attention_status" "attention_status",
    "attention_deadline_at" TIMESTAMPTZ(6),
    "recovery_action" VARCHAR(80),
    "last_failure_code" VARCHAR(120),
    "last_failure_message" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "outbox_events_versions_check" CHECK ("event_version" > 0 AND "job_version" > 0 AND "aggregate_version" >= 0),
    CONSTRAINT "outbox_events_attempts_check" CHECK ("dispatch_attempts" >= 0),
    CONSTRAINT "outbox_events_scope_check" CHECK (("scope_type" IS NULL) = ("scope_id" IS NULL)),
    CONSTRAINT "outbox_events_job_id_check" CHECK (POSITION(':' IN "id"::text) = 0),
    CONSTRAINT "outbox_events_attention_check" CHECK (
      ("attention_status" IS NULL AND "attention_owner" IS NULL AND "attention_deadline_at" IS NULL AND "recovery_action" IS NULL)
      OR
      ("attention_status" IS NOT NULL AND "attention_owner" IS NOT NULL AND "attention_deadline_at" IS NOT NULL AND "recovery_action" IS NOT NULL)
    )
);

CREATE TABLE "job_executions" (
    "id" UUID NOT NULL,
    "outbox_event_id" UUID,
    "queue_name" VARCHAR(80) NOT NULL,
    "job_id" VARCHAR(200) NOT NULL,
    "job_name" VARCHAR(160) NOT NULL,
    "job_version" INTEGER NOT NULL,
    "aggregate_version" BIGINT NOT NULL,
    "status" "job_execution_status" NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "lease_owner" VARCHAR(160),
    "lease_expires_at" TIMESTAMPTZ(6),
    "service_principal" VARCHAR(120) NOT NULL,
    "correlation_id" VARCHAR(200) NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "dead_lettered_at" TIMESTAMPTZ(6),
    "attention_owner" "attention_owner",
    "attention_status" "attention_status",
    "attention_deadline_at" TIMESTAMPTZ(6),
    "recovery_action" VARCHAR(80),
    "last_failure_code" VARCHAR(120),
    "last_failure_message" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_executions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "job_executions_versions_check" CHECK ("job_version" > 0 AND "aggregate_version" >= 0),
    CONSTRAINT "job_executions_attempt_count_check" CHECK ("attempt_count" >= 0),
    CONSTRAINT "job_executions_job_id_check" CHECK (POSITION(':' IN "job_id") = 0),
    CONSTRAINT "job_executions_attention_check" CHECK (
      ("attention_status" IS NULL AND "attention_owner" IS NULL AND "attention_deadline_at" IS NULL AND "recovery_action" IS NULL)
      OR
      ("attention_status" IS NOT NULL AND "attention_owner" IS NOT NULL AND "attention_deadline_at" IS NOT NULL AND "recovery_action" IS NOT NULL)
    )
);

CREATE TABLE "job_execution_attempts" (
    "id" BIGSERIAL NOT NULL,
    "job_execution_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" "job_attempt_status" NOT NULL,
    "worker_identity" VARCHAR(160) NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "finished_at" TIMESTAMPTZ(6),
    "failure_code" VARCHAR(120),
    "failure_message" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_execution_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "job_execution_attempts_attempt_check" CHECK ("attempt_number" > 0)
);

CREATE INDEX "outbox_events_aggregate_idx" ON "outbox_events"("aggregate_type", "aggregate_id", "aggregate_version");
CREATE INDEX "outbox_events_claim_idx" ON "outbox_events"("status", "available_at", "created_at")
  WHERE "status" = 'PENDING' AND "dead_lettered_at" IS NULL;
CREATE INDEX "outbox_events_recovery_idx" ON "outbox_events"("status", "dispatched_at", "created_at")
  WHERE "status" = 'DISPATCHED' AND "processed_at" IS NULL AND "dead_lettered_at" IS NULL;
CREATE UNIQUE INDEX "job_executions_queue_job_key" ON "job_executions"("queue_name", "job_id");
CREATE INDEX "job_executions_outbox_event_idx" ON "job_executions"("outbox_event_id");
CREATE INDEX "job_executions_attention_idx" ON "job_executions"("attention_owner", "attention_status", "attention_deadline_at", "created_at")
  WHERE "attention_status" IN ('OPEN', 'ACKNOWLEDGED');
CREATE UNIQUE INDEX "job_execution_attempts_execution_attempt_key" ON "job_execution_attempts"("job_execution_id", "attempt_number");
CREATE INDEX "job_execution_attempts_history_idx" ON "job_execution_attempts"("job_execution_id", "created_at");

ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_outbox_event_id_fkey"
  FOREIGN KEY ("outbox_event_id") REFERENCES "outbox_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_execution_attempts" ADD CONSTRAINT "job_execution_attempts_job_execution_id_fkey"
  FOREIGN KEY ("job_execution_id") REFERENCES "job_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
