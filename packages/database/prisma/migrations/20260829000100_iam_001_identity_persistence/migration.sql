-- IAM-001 identity persistence foundation.
-- Additive only: establishes persistence authority without authentication or authorization workflows.

CREATE TYPE "account_status" AS ENUM ('PENDING_EMAIL', 'ACTIVE', 'RECOVERY_LOCKED', 'COMPROMISED_LOCKED', 'SUSPENDED', 'DEACTIVATION_REQUESTED', 'DEACTIVATED');
CREATE TYPE "credential_type" AS ENUM ('PASSWORD');
CREATE TYPE "session_status" AS ENUM ('ACTIVE', 'STEP_UP_REQUIRED', 'REVOKED', 'EXPIRED');
CREATE TYPE "authentication_assurance" AS ENUM ('ANONYMOUS', 'AUTHENTICATED', 'CONTACT_VERIFIED', 'RECENTLY_AUTHENTICATED', 'MFA_VERIFIED', 'PRIVILEGED_MFA_RECENT');
CREATE TYPE "identity_token_purpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RECOVERY');

CREATE TABLE "users" (
  "id" UUID NOT NULL,
  "public_reference" VARCHAR(32) NOT NULL,
  "status" "account_status" NOT NULL DEFAULT 'PENDING_EMAIL',
  "display_name" VARCHAR(160) NOT NULL,
  "locale" VARCHAR(35) NOT NULL DEFAULT 'en-NG',
  "version" INTEGER NOT NULL DEFAULT 0,
  "security_version" INTEGER NOT NULL DEFAULT 0,
  "last_transition_at" TIMESTAMPTZ(6) NOT NULL,
  "last_transition_id" UUID NOT NULL,
  "status_reason_code" VARCHAR(80),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deactivated_at" TIMESTAMPTZ(6),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_versions_check" CHECK ("version" >= 0 AND "security_version" >= 0),
  CONSTRAINT "users_public_reference_check" CHECK ("public_reference" = btrim("public_reference") AND length("public_reference") >= 6),
  CONSTRAINT "users_display_name_check" CHECK ("display_name" = btrim("display_name") AND length("display_name") > 0),
  CONSTRAINT "users_locale_check" CHECK ("locale" = btrim("locale") AND length("locale") > 0),
  CONSTRAINT "users_deactivation_check" CHECK (("status" = 'DEACTIVATED') = ("deactivated_at" IS NOT NULL)),
  CONSTRAINT "users_transition_time_check" CHECK ("last_transition_at" >= "created_at")
);

CREATE TABLE "user_emails" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "display_email" VARCHAR(320) NOT NULL,
  "normalized_email" VARCHAR(320) NOT NULL,
  "verified_at" TIMESTAMPTZ(6),
  "primary_at" TIMESTAMPTZ(6),
  "retired_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_emails_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_emails_display_check" CHECK ("display_email" = btrim("display_email") AND length("display_email") > 0),
  CONSTRAINT "user_emails_normalized_check" CHECK (
    "normalized_email" = btrim("normalized_email") AND "normalized_email" = lower("normalized_email")
    AND length("normalized_email") > 2 AND position('@' IN "normalized_email") > 1
    AND position('@' IN "normalized_email") < length("normalized_email")
    AND position('@' IN substring("normalized_email" FROM position('@' IN "normalized_email") + 1)) = 0
  ),
  CONSTRAINT "user_emails_time_check" CHECK (
    ("verified_at" IS NULL OR "verified_at" >= "created_at")
    AND ("primary_at" IS NULL OR "primary_at" >= "created_at")
    AND ("retired_at" IS NULL OR "retired_at" >= "created_at")
  )
);

CREATE TABLE "credentials" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "credential_type" NOT NULL,
  "encoded_hash" TEXT NOT NULL,
  "hash_algorithm" VARCHAR(40) NOT NULL,
  "hash_policy_version" INTEGER NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rotated_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  CONSTRAINT "credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "credentials_metadata_check" CHECK (
    length("encoded_hash") >= 20 AND "hash_algorithm" = btrim("hash_algorithm")
    AND length("hash_algorithm") > 0 AND "hash_policy_version" > 0 AND "version" >= 0
  ),
  CONSTRAINT "credentials_time_check" CHECK (
    ("rotated_at" IS NULL OR "rotated_at" >= "created_at")
    AND ("revoked_at" IS NULL OR "revoked_at" >= "created_at")
  )
);

CREATE TABLE "sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_digest" VARCHAR(128) NOT NULL,
  "status" "session_status" NOT NULL DEFAULT 'ACTIVE',
  "assurance" "authentication_assurance" NOT NULL,
  "issued_security_version" INTEGER NOT NULL,
  "issued_at" TIMESTAMPTZ(6) NOT NULL,
  "last_used_at" TIMESTAMPTZ(6) NOT NULL,
  "idle_expires_at" TIMESTAMPTZ(6) NOT NULL,
  "absolute_expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "revocation_code" VARCHAR(80),
  "device_label" VARCHAR(80) NOT NULL,
  "client_family" VARCHAR(80),
  "version" INTEGER NOT NULL DEFAULT 0,
  "last_transition_at" TIMESTAMPTZ(6) NOT NULL,
  "last_transition_id" UUID NOT NULL,
  "status_reason_code" VARCHAR(80),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_digest_check" CHECK ("token_digest" = btrim("token_digest") AND length("token_digest") >= 32),
  CONSTRAINT "sessions_security_version_check" CHECK ("issued_security_version" >= 0 AND "version" >= 0),
  CONSTRAINT "sessions_assurance_check" CHECK ("assurance" <> 'ANONYMOUS'),
  CONSTRAINT "sessions_device_check" CHECK (
    "device_label" = btrim("device_label") AND length("device_label") > 0
    AND ("client_family" IS NULL OR ("client_family" = btrim("client_family") AND length("client_family") > 0))
  ),
  CONSTRAINT "sessions_expiry_check" CHECK (
    "last_used_at" >= "issued_at" AND "idle_expires_at" > "last_used_at"
    AND "absolute_expires_at" > "issued_at" AND "idle_expires_at" <= "absolute_expires_at"
    AND "last_transition_at" >= "issued_at"
  ),
  CONSTRAINT "sessions_revocation_check" CHECK (
    ("status" = 'REVOKED') = ("revoked_at" IS NOT NULL)
    AND (("revoked_at" IS NULL AND "revocation_code" IS NULL)
      OR ("revoked_at" IS NOT NULL AND "revocation_code" IS NOT NULL AND "revoked_at" >= "issued_at"))
  )
);

CREATE TABLE "identity_tokens" (
  "id" UUID NOT NULL,
  "user_email_id" UUID NOT NULL,
  "purpose" "identity_token_purpose" NOT NULL,
  "token_digest" VARCHAR(128) NOT NULL,
  "issued_security_version" INTEGER NOT NULL,
  "issued_at" TIMESTAMPTZ(6) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "invalidated_at" TIMESTAMPTZ(6),
  "invalidation_code" VARCHAR(80),
  "replaced_by_token_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "identity_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "identity_tokens_digest_check" CHECK ("token_digest" = btrim("token_digest") AND length("token_digest") >= 32),
  CONSTRAINT "identity_tokens_expiry_check" CHECK (
    "issued_security_version" >= 0 AND "expires_at" > "issued_at"
    AND ("consumed_at" IS NULL OR ("consumed_at" >= "issued_at" AND "consumed_at" < "expires_at"))
    AND ("invalidated_at" IS NULL OR "invalidated_at" >= "issued_at")
  ),
  CONSTRAINT "identity_tokens_terminal_check" CHECK (
    NOT ("consumed_at" IS NOT NULL AND "invalidated_at" IS NOT NULL)
    AND (("invalidated_at" IS NULL AND "invalidation_code" IS NULL AND "replaced_by_token_id" IS NULL)
      OR ("invalidated_at" IS NOT NULL AND "invalidation_code" IS NOT NULL))
    AND ("replaced_by_token_id" IS NULL OR "replaced_by_token_id" <> "id")
  )
);

CREATE TABLE "recovery_attempts" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "subject_digest" VARCHAR(128) NOT NULL,
  "correlation_id" VARCHAR(200) NOT NULL,
  "method_code" VARCHAR(80) NOT NULL,
  "outcome_code" VARCHAR(80) NOT NULL,
  "assurance_evidence_code" VARCHAR(80),
  "containment_code" VARCHAR(80),
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recovery_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recovery_attempts_digest_check" CHECK ("subject_digest" = btrim("subject_digest") AND length("subject_digest") >= 32),
  CONSTRAINT "recovery_attempts_codes_check" CHECK (
    "correlation_id" = btrim("correlation_id") AND length("correlation_id") > 0
    AND "method_code" = btrim("method_code") AND length("method_code") > 0
    AND "outcome_code" = btrim("outcome_code") AND length("outcome_code") > 0
    AND ("assurance_evidence_code" IS NULL OR ("assurance_evidence_code" = btrim("assurance_evidence_code") AND length("assurance_evidence_code") > 0))
    AND ("containment_code" IS NULL OR ("containment_code" = btrim("containment_code") AND length("containment_code") > 0))
  )
);

CREATE UNIQUE INDEX "users_public_reference_key" ON "users"("public_reference");
CREATE INDEX "users_status_created_idx" ON "users"("status", "created_at");
CREATE UNIQUE INDEX "user_emails_active_normalized_key" ON "user_emails"("normalized_email") WHERE "retired_at" IS NULL;
CREATE UNIQUE INDEX "user_emails_active_primary_key" ON "user_emails"("user_id") WHERE "retired_at" IS NULL AND "primary_at" IS NOT NULL;
CREATE INDEX "user_emails_user_retired_idx" ON "user_emails"("user_id", "retired_at");
CREATE UNIQUE INDEX "credentials_active_password_key" ON "credentials"("user_id") WHERE "type" = 'PASSWORD' AND "revoked_at" IS NULL;
CREATE INDEX "credentials_user_type_revoked_idx" ON "credentials"("user_id", "type", "revoked_at");
CREATE UNIQUE INDEX "sessions_token_digest_key" ON "sessions"("token_digest");
CREATE INDEX "sessions_user_status_expiry_idx" ON "sessions"("user_id", "status", "absolute_expires_at");
CREATE INDEX "sessions_active_user_expiry_idx" ON "sessions"("user_id", "idle_expires_at", "absolute_expires_at") WHERE "status" IN ('ACTIVE', 'STEP_UP_REQUIRED') AND "revoked_at" IS NULL;
CREATE UNIQUE INDEX "identity_tokens_token_digest_key" ON "identity_tokens"("token_digest");
CREATE INDEX "identity_tokens_subject_purpose_expiry_idx" ON "identity_tokens"("user_email_id", "purpose", "expires_at");
CREATE INDEX "identity_tokens_consumable_idx" ON "identity_tokens"("purpose", "expires_at") WHERE "consumed_at" IS NULL AND "invalidated_at" IS NULL;
CREATE INDEX "recovery_attempts_subject_time_idx" ON "recovery_attempts"("subject_digest", "occurred_at");
CREATE INDEX "recovery_attempts_user_time_idx" ON "recovery_attempts"("user_id", "occurred_at");

ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "identity_tokens" ADD CONSTRAINT "identity_tokens_user_email_id_fkey" FOREIGN KEY ("user_email_id") REFERENCES "user_emails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "identity_tokens" ADD CONSTRAINT "identity_tokens_replaced_by_token_id_fkey" FOREIGN KEY ("replaced_by_token_id") REFERENCES "identity_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recovery_attempts" ADD CONSTRAINT "recovery_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "reject_recovery_attempt_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'recovery_attempts are append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "recovery_attempts_append_only" BEFORE UPDATE OR DELETE ON "recovery_attempts"
FOR EACH ROW EXECUTE FUNCTION "reject_recovery_attempt_mutation"();
