-- SEC-003: additive operational checkpoint only; no encrypted business values or MFA factors.
CREATE TYPE "encryption_migration_status" AS ENUM ('PENDING', 'RUNNING', 'BLOCKED', 'COMPLETED');

CREATE TABLE "encryption_migration_runs" (
  "id" UUID NOT NULL,
  "consumer_id" VARCHAR(120) NOT NULL,
  "environment" VARCHAR(20) NOT NULL,
  "source_policy_id" VARCHAR(160) NOT NULL,
  "target_policy_id" VARCHAR(160) NOT NULL,
  "status" "encryption_migration_status" NOT NULL DEFAULT 'PENDING',
  "lease_owner" VARCHAR(160),
  "lease_expires_at" TIMESTAMPTZ(6),
  "cursor" VARCHAR(256),
  "discovered_count" BIGINT NOT NULL DEFAULT 0,
  "already_current_count" BIGINT NOT NULL DEFAULT 0,
  "migrated_count" BIGINT NOT NULL DEFAULT 0,
  "failed_count" BIGINT NOT NULL DEFAULT 0,
  "remaining_count" BIGINT,
  "last_failure_code" VARCHAR(80),
  "correlation_id" VARCHAR(160) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6),
  CONSTRAINT "encryption_migration_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "encryption_migration_runs_identity_check" CHECK (
    "consumer_id" = btrim("consumer_id") AND length("consumer_id") > 0
    AND "source_policy_id" = btrim("source_policy_id") AND length("source_policy_id") > 0
    AND "target_policy_id" = btrim("target_policy_id") AND length("target_policy_id") > 0
    AND "source_policy_id" <> "target_policy_id"
    AND "environment" IN ('development', 'test', 'preview', 'staging', 'production')
    AND "correlation_id" = btrim("correlation_id") AND length("correlation_id") > 0
  ),
  CONSTRAINT "encryption_migration_runs_counts_check" CHECK (
    "discovered_count" >= 0 AND "already_current_count" >= 0 AND "migrated_count" >= 0
    AND "failed_count" >= 0 AND ("remaining_count" IS NULL OR "remaining_count" >= 0)
    AND "version" >= 0
  ),
  CONSTRAINT "encryption_migration_runs_lease_check" CHECK (
    ("lease_owner" IS NULL) = ("lease_expires_at" IS NULL)
    AND ("status" <> 'COMPLETED' OR ("lease_owner" IS NULL AND "remaining_count" = 0 AND "failed_count" = 0 AND "completed_at" IS NOT NULL))
  )
);

CREATE INDEX "encryption_migration_runs_claim_idx" ON "encryption_migration_runs"("status", "lease_expires_at");
CREATE INDEX "encryption_migration_runs_consumer_idx" ON "encryption_migration_runs"("consumer_id", "created_at");
CREATE UNIQUE INDEX "encryption_migration_runs_active_consumer_key" ON "encryption_migration_runs"("consumer_id", "environment") WHERE "status" <> 'COMPLETED';
