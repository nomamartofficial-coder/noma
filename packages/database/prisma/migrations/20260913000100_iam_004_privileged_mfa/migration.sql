-- IAM-004: additive evidence and authenticator authority. Existing sessions deliberately receive NULL proofs.
CREATE TYPE "mfa_factor_status" AS ENUM ('PENDING_ENROLLMENT', 'ACTIVE', 'REPLACED', 'REVOKED');
CREATE TYPE "mfa_recovery_batch_status" AS ENUM ('ACTIVE', 'INVALIDATED');
CREATE TYPE "step_up_requirement" AS ENUM ('RECENT_AUTH', 'MFA', 'MFA_AND_RECENT');
CREATE TYPE "mfa_method" AS ENUM ('TOTP', 'RECOVERY_CODE');

ALTER TABLE "sessions"
  ADD COLUMN "password_authenticated_at" TIMESTAMPTZ(6),
  ADD COLUMN "mfa_verified_at" TIMESTAMPTZ(6),
  ADD COLUMN "mfa_method" "mfa_method",
  ADD COLUMN "mfa_factor_id" UUID;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_mfa_evidence_check" CHECK (
  ("mfa_verified_at" IS NULL AND "mfa_method" IS NULL AND "mfa_factor_id" IS NULL)
  OR ("mfa_verified_at" IS NOT NULL AND "mfa_method" IS NOT NULL AND "mfa_factor_id" IS NOT NULL)
);

CREATE TABLE "mfa_factors" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "status" "mfa_factor_status" NOT NULL,
  "encrypted_seed_envelope" JSONB NOT NULL,
  "algorithm" VARCHAR(16) NOT NULL,
  "digits" INTEGER NOT NULL,
  "period_seconds" INTEGER NOT NULL,
  "last_accepted_time_step" BIGINT,
  "enrollment_expires_at" TIMESTAMPTZ(6) NOT NULL,
  "activated_at" TIMESTAMPTZ(6),
  "replaced_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mfa_factors_profile_check" CHECK ("algorithm" = 'SHA1' AND "digits" = 6 AND "period_seconds" = 30),
  CONSTRAINT "mfa_factors_version_check" CHECK ("version" >= 0),
  CONSTRAINT "mfa_factors_evidence_check" CHECK (
    ("status" = 'PENDING_ENROLLMENT' AND "activated_at" IS NULL AND "replaced_at" IS NULL AND "revoked_at" IS NULL)
    OR ("status" = 'ACTIVE' AND "activated_at" IS NOT NULL AND "replaced_at" IS NULL AND "revoked_at" IS NULL)
    OR ("status" = 'REPLACED' AND "activated_at" IS NOT NULL AND "replaced_at" IS NOT NULL AND "revoked_at" IS NULL)
    OR ("status" = 'REVOKED' AND "revoked_at" IS NOT NULL)
  )
);
CREATE INDEX "mfa_factors_user_status_idx" ON "mfa_factors"("user_id", "status");
CREATE UNIQUE INDEX "mfa_factors_one_active_totp_per_user" ON "mfa_factors"("user_id") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "mfa_factors_one_pending_totp_per_user" ON "mfa_factors"("user_id") WHERE "status" = 'PENDING_ENROLLMENT';
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_mfa_factor_id_fkey" FOREIGN KEY ("mfa_factor_id") REFERENCES "mfa_factors"("id") ON DELETE RESTRICT;

CREATE TABLE "mfa_recovery_code_batches" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "factor_id" UUID NOT NULL REFERENCES "mfa_factors"("id") ON DELETE RESTRICT,
  "status" "mfa_recovery_batch_status" NOT NULL,
  "issued_at" TIMESTAMPTZ(6) NOT NULL,
  "invalidated_at" TIMESTAMPTZ(6),
  "version" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "mfa_recovery_batches_version_check" CHECK ("version" >= 0),
  CONSTRAINT "mfa_recovery_batches_status_check" CHECK (("status" = 'ACTIVE') = ("invalidated_at" IS NULL))
);
CREATE INDEX "mfa_recovery_batches_factor_status_idx" ON "mfa_recovery_code_batches"("factor_id", "status");
CREATE UNIQUE INDEX "mfa_recovery_batches_one_active_per_user" ON "mfa_recovery_code_batches"("user_id") WHERE "status" = 'ACTIVE';

CREATE TABLE "mfa_recovery_codes" (
  "id" UUID NOT NULL PRIMARY KEY,
  "batch_id" UUID NOT NULL REFERENCES "mfa_recovery_code_batches"("id") ON DELETE RESTRICT,
  "code_digest" VARCHAR(128) NOT NULL UNIQUE,
  "consumed_at" TIMESTAMPTZ(6),
  "invalidated_at" TIMESTAMPTZ(6),
  "version" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "mfa_recovery_codes_digest_check" CHECK ("code_digest" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "mfa_recovery_codes_version_check" CHECK ("version" >= 0),
  CONSTRAINT "mfa_recovery_codes_lifecycle_check" CHECK ("consumed_at" IS NULL OR "invalidated_at" IS NULL)
);
CREATE INDEX "mfa_recovery_codes_usable_idx" ON "mfa_recovery_codes"("batch_id", "consumed_at", "invalidated_at");

CREATE TABLE "session_step_up_challenges" (
  "id" UUID NOT NULL PRIMARY KEY,
  "session_id" UUID NOT NULL REFERENCES "sessions"("id") ON DELETE RESTRICT,
  "requirement" "step_up_requirement" NOT NULL,
  "context_code" VARCHAR(80) NOT NULL,
  "issued_security_version" INTEGER NOT NULL,
  "password_proven_at" TIMESTAMPTZ(6),
  "mfa_proven_at" TIMESTAMPTZ(6),
  "mfa_method" "mfa_method",
  "mfa_factor_id" UUID,
  "issued_at" TIMESTAMPTZ(6) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "completed_at" TIMESTAMPTZ(6),
  "invalidated_at" TIMESTAMPTZ(6),
  "version" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "session_step_up_challenges_context_check" CHECK ("context_code" ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  CONSTRAINT "session_step_up_challenges_expiry_check" CHECK ("expires_at" > "issued_at"),
  CONSTRAINT "session_step_up_challenges_version_check" CHECK ("version" >= 0 AND "issued_security_version" >= 0),
  CONSTRAINT "session_step_up_challenges_mfa_evidence_check" CHECK (
    ("mfa_proven_at" IS NULL AND "mfa_method" IS NULL AND "mfa_factor_id" IS NULL)
    OR ("mfa_proven_at" IS NOT NULL AND "mfa_method" IS NOT NULL AND "mfa_factor_id" IS NOT NULL)
  )
);
CREATE INDEX "session_step_up_challenges_session_expiry_idx" ON "session_step_up_challenges"("session_id", "expires_at");
CREATE UNIQUE INDEX "session_step_up_challenges_one_live_per_session" ON "session_step_up_challenges"("session_id")
  WHERE "completed_at" IS NULL AND "invalidated_at" IS NULL;
ALTER TABLE "session_step_up_challenges" ADD CONSTRAINT "session_step_up_challenges_mfa_factor_id_fkey" FOREIGN KEY ("mfa_factor_id") REFERENCES "mfa_factors"("id") ON DELETE RESTRICT;
