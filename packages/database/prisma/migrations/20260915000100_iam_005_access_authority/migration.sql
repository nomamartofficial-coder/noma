-- IAM-005: additive scoped Access authority foundation. No protected surface is activated.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "access_scope_type" AS ENUM ('SELF', 'SELLER', 'INSTITUTION', 'ORDER', 'CASE', 'ASSIGNMENT', 'FULFILMENT_LOCATION', 'QUEUE', 'CARRIER', 'PLATFORM');
CREATE TYPE "access_subject_type" AS ENUM ('HUMAN', 'SERVICE_PRINCIPAL');
CREATE TYPE "access_privilege_class" AS ENUM ('ORDINARY', 'PRIVILEGED');
CREATE TYPE "role_template_status" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');
CREATE TYPE "access_approval_operation" AS ENUM ('ASSIGNMENT_GRANT', 'ASSIGNMENT_REVOKE', 'TEMPORARY_ACCESS_GRANT', 'TEMPORARY_ACCESS_REVOKE');
CREATE TYPE "access_approval_state" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "access_approval_decision_value" AS ENUM ('APPROVE', 'REJECT');

CREATE TABLE "access_scopes" (
  "id" UUID NOT NULL PRIMARY KEY,
  "type" "access_scope_type" NOT NULL,
  "user_id" UUID,
  "resource_id" UUID,
  "parent_institution_scope_id" UUID,
  "retired_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "access_scopes_shape_check" CHECK (
    ("type" = 'SELF' AND "user_id" IS NOT NULL AND "resource_id" IS NULL AND "parent_institution_scope_id" IS NULL)
    OR ("type" = 'PLATFORM' AND "user_id" IS NULL AND "resource_id" IS NULL AND "parent_institution_scope_id" IS NULL)
    OR ("type" = 'INSTITUTION' AND "user_id" IS NULL AND "resource_id" IS NOT NULL AND "parent_institution_scope_id" IS NULL)
    OR ("type" IN ('SELLER', 'ORDER', 'CASE', 'ASSIGNMENT', 'FULFILMENT_LOCATION', 'QUEUE', 'CARRIER')
      AND "user_id" IS NULL AND "resource_id" IS NOT NULL AND "parent_institution_scope_id" IS NOT NULL)
  ),
  CONSTRAINT "access_scopes_self_parent_check" CHECK ("parent_institution_scope_id" IS NULL OR "parent_institution_scope_id" <> "id"),
  CONSTRAINT "access_scopes_retired_time_check" CHECK ("retired_at" IS NULL OR "retired_at" >= "created_at"),
  CONSTRAINT "access_scopes_id_type_key" UNIQUE ("id", "type"),
  CONSTRAINT "access_scopes_type_resource_key" UNIQUE ("type", "resource_id"),
  CONSTRAINT "access_scopes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "access_scopes_parent_fkey" FOREIGN KEY ("parent_institution_scope_id") REFERENCES "access_scopes"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "access_scopes_self_user_key" ON "access_scopes"("user_id") WHERE "type" = 'SELF';
CREATE UNIQUE INDEX "access_scopes_platform_singleton_key" ON "access_scopes"((TRUE)) WHERE "type" = 'PLATFORM';
CREATE INDEX "access_scopes_parent_type_idx" ON "access_scopes"("parent_institution_scope_id", "type");

CREATE TABLE "capabilities" (
  "id" UUID NOT NULL PRIMARY KEY,
  "code" VARCHAR(120) NOT NULL,
  "description" VARCHAR(240) NOT NULL,
  "retired_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "capabilities_code_key" UNIQUE ("code"),
  CONSTRAINT "capabilities_code_check" CHECK ("code" ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$' AND position('*' IN "code") = 0),
  CONSTRAINT "capabilities_description_check" CHECK ("description" = btrim("description") AND length("description") > 0),
  CONSTRAINT "capabilities_retired_time_check" CHECK ("retired_at" IS NULL OR "retired_at" >= "created_at")
);

CREATE TABLE "role_templates" (
  "id" UUID NOT NULL PRIMARY KEY,
  "code" VARCHAR(80) NOT NULL,
  "version" INTEGER NOT NULL,
  "display_name" VARCHAR(120) NOT NULL,
  "status" "role_template_status" NOT NULL DEFAULT 'DRAFT',
  "privilege_class" "access_privilege_class" NOT NULL,
  "require_contact_verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "password_max_age_milliseconds" INTEGER,
  "mfa_max_age_milliseconds" INTEGER,
  "activated_at" TIMESTAMPTZ(6),
  "retired_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_templates_code_version_key" UNIQUE ("code", "version"),
  CONSTRAINT "role_templates_code_check" CHECK ("code" ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$'),
  CONSTRAINT "role_templates_name_check" CHECK ("display_name" = btrim("display_name") AND length("display_name") > 0),
  CONSTRAINT "role_templates_version_check" CHECK ("version" > 0),
  CONSTRAINT "role_templates_assurance_check" CHECK (
    ("password_max_age_milliseconds" IS NULL OR "password_max_age_milliseconds" BETWEEN 60000 AND 600000)
    AND ("mfa_max_age_milliseconds" IS NULL OR "mfa_max_age_milliseconds" BETWEEN 60000 AND 43200000)
    AND ("privilege_class" = 'PRIVILEGED' OR "mfa_max_age_milliseconds" IS NULL)
  ),
  CONSTRAINT "role_templates_lifecycle_check" CHECK (
    ("status" = 'DRAFT' AND "activated_at" IS NULL AND "retired_at" IS NULL)
    OR ("status" = 'ACTIVE' AND "activated_at" IS NOT NULL AND "retired_at" IS NULL)
    OR ("status" = 'RETIRED' AND "activated_at" IS NOT NULL AND "retired_at" IS NOT NULL AND "retired_at" >= "activated_at")
  )
);
CREATE INDEX "role_templates_status_code_idx" ON "role_templates"("status", "code");

CREATE TABLE "role_template_allowed_scopes" (
  "role_template_id" UUID NOT NULL,
  "scope_type" "access_scope_type" NOT NULL,
  PRIMARY KEY ("role_template_id", "scope_type"),
  CONSTRAINT "role_template_allowed_scopes_template_fkey" FOREIGN KEY ("role_template_id") REFERENCES "role_templates"("id") ON DELETE RESTRICT
);

CREATE TABLE "role_template_allowed_subjects" (
  "role_template_id" UUID NOT NULL,
  "subject_type" "access_subject_type" NOT NULL,
  PRIMARY KEY ("role_template_id", "subject_type"),
  CONSTRAINT "role_template_allowed_subjects_template_fkey" FOREIGN KEY ("role_template_id") REFERENCES "role_templates"("id") ON DELETE RESTRICT
);

CREATE TABLE "role_template_capabilities" (
  "role_template_id" UUID NOT NULL,
  "capability_id" UUID NOT NULL,
  PRIMARY KEY ("role_template_id", "capability_id"),
  CONSTRAINT "role_template_capabilities_template_fkey" FOREIGN KEY ("role_template_id") REFERENCES "role_templates"("id") ON DELETE RESTRICT,
  CONSTRAINT "role_template_capabilities_capability_fkey" FOREIGN KEY ("capability_id") REFERENCES "capabilities"("id") ON DELETE RESTRICT
);

CREATE TABLE "service_principals" (
  "id" UUID NOT NULL PRIMARY KEY,
  "environment" VARCHAR(20) NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "purpose" VARCHAR(240) NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "credential_policy_version" INTEGER NOT NULL,
  "last_rotated_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "revoked_by_user_id" UUID,
  "revocation_reason" VARCHAR(500),
  "version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_principals_environment_code_key" UNIQUE ("environment", "code"),
  CONSTRAINT "service_principals_environment_check" CHECK ("environment" IN ('test', 'preview', 'staging', 'production')),
  CONSTRAINT "service_principals_code_check" CHECK ("code" ~ '^[a-z][a-z0-9_-]{1,99}$'),
  CONSTRAINT "service_principals_purpose_check" CHECK ("purpose" = btrim("purpose") AND length("purpose") > 0),
  CONSTRAINT "service_principals_policy_check" CHECK ("credential_policy_version" > 0 AND "version" >= 0),
  CONSTRAINT "service_principals_revocation_check" CHECK (
    ("revoked_at" IS NULL AND "revoked_by_user_id" IS NULL AND "revocation_reason" IS NULL)
    OR ("revoked_at" IS NOT NULL AND "revoked_by_user_id" IS NOT NULL AND "revocation_reason" IS NOT NULL)
  ),
  CONSTRAINT "service_principals_owner_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "service_principals_revoker_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
);
CREATE INDEX "service_principals_owner_revoked_idx" ON "service_principals"("owner_user_id", "revoked_at");

CREATE TABLE "role_assignments" (
  "id" UUID NOT NULL PRIMARY KEY,
  "subject_type" "access_subject_type" NOT NULL,
  "user_id" UUID,
  "service_principal_id" UUID,
  "role_template_id" UUID NOT NULL,
  "scope_id" UUID NOT NULL,
  "scope_type" "access_scope_type" NOT NULL,
  "valid_from" TIMESTAMPTZ(6) NOT NULL,
  "valid_until" TIMESTAMPTZ(6),
  "granted_by_user_id" UUID NOT NULL,
  "grant_reason" VARCHAR(500) NOT NULL,
  "granted_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_by_user_id" UUID,
  "revocation_reason" VARCHAR(500),
  "revoked_at" TIMESTAMPTZ(6),
  "version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_assignments_subject_xor_check" CHECK (
    ("subject_type" = 'HUMAN' AND "user_id" IS NOT NULL AND "service_principal_id" IS NULL)
    OR ("subject_type" = 'SERVICE_PRINCIPAL' AND "user_id" IS NULL AND "service_principal_id" IS NOT NULL)
  ),
  CONSTRAINT "role_assignments_validity_check" CHECK ("valid_until" IS NULL OR "valid_until" > "valid_from"),
  CONSTRAINT "role_assignments_reason_check" CHECK ("grant_reason" = btrim("grant_reason") AND length("grant_reason") > 0),
  CONSTRAINT "role_assignments_revocation_check" CHECK (
    ("revoked_at" IS NULL AND "revoked_by_user_id" IS NULL AND "revocation_reason" IS NULL)
    OR ("revoked_at" IS NOT NULL AND "revoked_by_user_id" IS NOT NULL AND "revocation_reason" IS NOT NULL AND "revoked_at" >= "granted_at")
  ),
  CONSTRAINT "role_assignments_version_check" CHECK ("version" >= 0),
  CONSTRAINT "role_assignments_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "role_assignments_service_fkey" FOREIGN KEY ("service_principal_id") REFERENCES "service_principals"("id") ON DELETE RESTRICT,
  CONSTRAINT "role_assignments_template_fkey" FOREIGN KEY ("role_template_id") REFERENCES "role_templates"("id") ON DELETE RESTRICT,
  CONSTRAINT "role_assignments_scope_fkey" FOREIGN KEY ("scope_id") REFERENCES "access_scopes"("id") ON DELETE RESTRICT,
  CONSTRAINT "role_assignments_scope_shape_fkey" FOREIGN KEY ("scope_id", "scope_type") REFERENCES "access_scopes"("id", "type") ON DELETE RESTRICT,
  CONSTRAINT "role_assignments_allowed_scope_fkey" FOREIGN KEY ("role_template_id", "scope_type") REFERENCES "role_template_allowed_scopes"("role_template_id", "scope_type") ON DELETE RESTRICT,
  CONSTRAINT "role_assignments_allowed_subject_fkey" FOREIGN KEY ("role_template_id", "subject_type") REFERENCES "role_template_allowed_subjects"("role_template_id", "subject_type") ON DELETE RESTRICT,
  CONSTRAINT "role_assignments_grantor_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "role_assignments_revoker_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
);
CREATE INDEX "role_assignments_user_validity_idx" ON "role_assignments"("user_id", "valid_from", "valid_until");
CREATE INDEX "role_assignments_service_validity_idx" ON "role_assignments"("service_principal_id", "valid_from", "valid_until");
CREATE INDEX "role_assignments_scope_validity_idx" ON "role_assignments"("scope_id", "valid_from", "valid_until");
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_user_no_overlap"
  EXCLUDE USING gist ("user_id" WITH =, "role_template_id" WITH =, "scope_id" WITH =, tstzrange("valid_from", "valid_until", '[)') WITH &&)
  WHERE ("revoked_at" IS NULL AND "user_id" IS NOT NULL);
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_service_no_overlap"
  EXCLUDE USING gist ("service_principal_id" WITH =, "role_template_id" WITH =, "scope_id" WITH =, tstzrange("valid_from", "valid_until", '[)') WITH &&)
  WHERE ("revoked_at" IS NULL AND "service_principal_id" IS NOT NULL);

CREATE TABLE "approval_requests" (
  "id" UUID NOT NULL PRIMARY KEY,
  "operation" "access_approval_operation" NOT NULL,
  "subject_type" "access_subject_type" NOT NULL,
  "target_user_id" UUID,
  "target_service_principal_id" UUID,
  "role_template_id" UUID NOT NULL,
  "scope_id" UUID NOT NULL,
  "scope_type" "access_scope_type" NOT NULL,
  "requested_valid_from" TIMESTAMPTZ(6) NOT NULL,
  "requested_valid_until" TIMESTAMPTZ(6),
  "requested_by_user_id" UUID NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "idempotency_key" VARCHAR(160) NOT NULL,
  "independent_approval_required" BOOLEAN NOT NULL,
  "state" "access_approval_state" NOT NULL DEFAULT 'PENDING',
  "version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_requests_subject_xor_check" CHECK (
    ("subject_type" = 'HUMAN' AND "target_user_id" IS NOT NULL AND "target_service_principal_id" IS NULL)
    OR ("subject_type" = 'SERVICE_PRINCIPAL' AND "target_user_id" IS NULL AND "target_service_principal_id" IS NOT NULL)
  ),
  CONSTRAINT "approval_requests_window_check" CHECK (
    ("requested_valid_until" IS NULL OR "requested_valid_until" > "requested_valid_from") AND "expires_at" > "created_at"
  ),
  CONSTRAINT "approval_requests_text_check" CHECK (
    "reason" = btrim("reason") AND length("reason") > 0
    AND "idempotency_key" = btrim("idempotency_key") AND length("idempotency_key") > 0
  ),
  CONSTRAINT "approval_requests_version_check" CHECK ("version" >= 0),
  CONSTRAINT "approval_requests_requestor_idempotency_key" UNIQUE ("requested_by_user_id", "idempotency_key"),
  CONSTRAINT "approval_requests_target_user_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "approval_requests_target_service_fkey" FOREIGN KEY ("target_service_principal_id") REFERENCES "service_principals"("id") ON DELETE RESTRICT,
  CONSTRAINT "approval_requests_template_fkey" FOREIGN KEY ("role_template_id") REFERENCES "role_templates"("id") ON DELETE RESTRICT,
  CONSTRAINT "approval_requests_scope_fkey" FOREIGN KEY ("scope_id") REFERENCES "access_scopes"("id") ON DELETE RESTRICT,
  CONSTRAINT "approval_requests_scope_shape_fkey" FOREIGN KEY ("scope_id", "scope_type") REFERENCES "access_scopes"("id", "type") ON DELETE RESTRICT,
  CONSTRAINT "approval_requests_allowed_scope_fkey" FOREIGN KEY ("role_template_id", "scope_type") REFERENCES "role_template_allowed_scopes"("role_template_id", "scope_type") ON DELETE RESTRICT,
  CONSTRAINT "approval_requests_allowed_subject_fkey" FOREIGN KEY ("role_template_id", "subject_type") REFERENCES "role_template_allowed_subjects"("role_template_id", "subject_type") ON DELETE RESTRICT,
  CONSTRAINT "approval_requests_requestor_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
);
CREATE INDEX "approval_requests_state_expiry_idx" ON "approval_requests"("state", "expires_at");

CREATE TABLE "approval_decisions" (
  "id" UUID NOT NULL PRIMARY KEY,
  "approval_request_id" UUID NOT NULL,
  "approver_user_id" UUID NOT NULL,
  "decision" "access_approval_decision_value" NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "decided_at" TIMESTAMPTZ(6) NOT NULL,
  "session_id" UUID NOT NULL,
  "security_version" INTEGER NOT NULL,
  "password_authenticated_at" TIMESTAMPTZ(6),
  "mfa_verified_at" TIMESTAMPTZ(6),
  "mfa_method" "mfa_method",
  "mfa_factor_id" UUID,
  "assurance_evaluated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_decisions_request_approver_key" UNIQUE ("approval_request_id", "approver_user_id"),
  CONSTRAINT "approval_decisions_reason_check" CHECK ("reason" = btrim("reason") AND length("reason") > 0),
  CONSTRAINT "approval_decisions_security_version_check" CHECK ("security_version" >= 0),
  CONSTRAINT "approval_decisions_mfa_evidence_check" CHECK (
    ("mfa_verified_at" IS NULL AND "mfa_method" IS NULL AND "mfa_factor_id" IS NULL)
    OR ("mfa_verified_at" IS NOT NULL AND "mfa_method" IS NOT NULL AND "mfa_factor_id" IS NOT NULL)
  ),
  CONSTRAINT "approval_decisions_request_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "approval_requests"("id") ON DELETE RESTRICT,
  CONSTRAINT "approval_decisions_approver_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "approval_decisions_session_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT,
  CONSTRAINT "approval_decisions_factor_fkey" FOREIGN KEY ("mfa_factor_id") REFERENCES "mfa_factors"("id") ON DELETE RESTRICT
);
CREATE INDEX "approval_decisions_approver_time_idx" ON "approval_decisions"("approver_user_id", "decided_at");

CREATE TABLE "temporary_access_grants" (
  "id" UUID NOT NULL PRIMARY KEY,
  "role_assignment_id" UUID NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "approval_request_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "temporary_access_grants_assignment_key" UNIQUE ("role_assignment_id"),
  CONSTRAINT "temporary_access_grants_reason_check" CHECK ("reason" = btrim("reason") AND length("reason") > 0),
  CONSTRAINT "temporary_access_grants_assignment_fkey" FOREIGN KEY ("role_assignment_id") REFERENCES "role_assignments"("id") ON DELETE RESTRICT,
  CONSTRAINT "temporary_access_grants_owner_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "temporary_access_grants_approval_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "approval_requests"("id") ON DELETE RESTRICT
);

CREATE FUNCTION "validate_access_scope_parent"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."parent_institution_scope_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "access_scopes" p
    WHERE p."id" = NEW."parent_institution_scope_id" AND p."type" = 'INSTITUTION' AND p."retired_at" IS NULL
  ) THEN
    RAISE EXCEPTION 'resource access scope requires an active institution parent' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "access_scopes_parent_guard" BEFORE INSERT OR UPDATE ON "access_scopes"
FOR EACH ROW EXECUTE FUNCTION "validate_access_scope_parent"();

CREATE FUNCTION "protect_access_scope_identity"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'access scopes are retired, not deleted' USING ERRCODE = '55000';
  END IF;
  IF NEW."type" IS DISTINCT FROM OLD."type" OR NEW."user_id" IS DISTINCT FROM OLD."user_id"
    OR NEW."resource_id" IS DISTINCT FROM OLD."resource_id"
    OR NEW."parent_institution_scope_id" IS DISTINCT FROM OLD."parent_institution_scope_id" THEN
    RAISE EXCEPTION 'access scope identity and parent are immutable' USING ERRCODE = '55000';
  END IF;
  IF OLD."retired_at" IS NOT NULL AND NEW."retired_at" IS DISTINCT FROM OLD."retired_at" THEN
    RAISE EXCEPTION 'retired access scope cannot be reactivated or rewritten' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "access_scopes_immutable" BEFORE UPDATE OR DELETE ON "access_scopes"
FOR EACH ROW EXECUTE FUNCTION "protect_access_scope_identity"();

CREATE FUNCTION "protect_capability_identity"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'capabilities are retired, not deleted' USING ERRCODE = '55000'; END IF;
  IF NEW."code" IS DISTINCT FROM OLD."code" THEN RAISE EXCEPTION 'capability code is immutable' USING ERRCODE = '55000'; END IF;
  IF OLD."retired_at" IS NOT NULL AND NEW."retired_at" IS DISTINCT FROM OLD."retired_at" THEN
    RAISE EXCEPTION 'retired capability cannot be reactivated or rewritten' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "capabilities_immutable_identity" BEFORE UPDATE OR DELETE ON "capabilities"
FOR EACH ROW EXECUTE FUNCTION "protect_capability_identity"();

CREATE FUNCTION "protect_role_template_lifecycle"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'role template versions are retained' USING ERRCODE = '55000'; END IF;
  IF OLD."status" = 'RETIRED' THEN RAISE EXCEPTION 'retired role template versions are immutable' USING ERRCODE = '55000'; END IF;
  IF OLD."status" = 'ACTIVE' THEN
    IF NEW."code" IS DISTINCT FROM OLD."code" OR NEW."version" IS DISTINCT FROM OLD."version"
      OR NEW."display_name" IS DISTINCT FROM OLD."display_name" OR NEW."privilege_class" IS DISTINCT FROM OLD."privilege_class"
      OR NEW."require_contact_verified" IS DISTINCT FROM OLD."require_contact_verified"
      OR NEW."password_max_age_milliseconds" IS DISTINCT FROM OLD."password_max_age_milliseconds"
      OR NEW."mfa_max_age_milliseconds" IS DISTINCT FROM OLD."mfa_max_age_milliseconds"
      OR NEW."activated_at" IS DISTINCT FROM OLD."activated_at" OR NEW."status" NOT IN ('ACTIVE', 'RETIRED') THEN
      RAISE EXCEPTION 'activated role template versions are immutable' USING ERRCODE = '55000';
    END IF;
  END IF;
  IF OLD."status" = 'DRAFT' AND NEW."status" = 'ACTIVE' THEN
    IF NOT EXISTS (SELECT 1 FROM "role_template_allowed_scopes" WHERE "role_template_id" = OLD."id")
      OR NOT EXISTS (SELECT 1 FROM "role_template_allowed_subjects" WHERE "role_template_id" = OLD."id")
      OR NOT EXISTS (SELECT 1 FROM "role_template_capabilities" WHERE "role_template_id" = OLD."id")
      OR EXISTS (
        SELECT 1 FROM "role_template_capabilities" rtc JOIN "capabilities" c ON c."id" = rtc."capability_id"
        WHERE rtc."role_template_id" = OLD."id" AND c."retired_at" IS NOT NULL
      ) THEN
      RAISE EXCEPTION 'role template activation requires allowed scopes, subjects, and current capabilities' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD."status" = 'DRAFT' AND NEW."status" <> 'DRAFT' THEN
    RAISE EXCEPTION 'draft role template may only transition to active' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "role_templates_lifecycle_guard" BEFORE UPDATE OR DELETE ON "role_templates"
FOR EACH ROW EXECUTE FUNCTION "protect_role_template_lifecycle"();

CREATE FUNCTION "require_draft_role_template_mapping"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE template_id UUID;
BEGIN
  template_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."role_template_id" ELSE NEW."role_template_id" END;
  IF NOT EXISTS (SELECT 1 FROM "role_templates" WHERE "id" = template_id AND "status" = 'DRAFT') THEN
    RAISE EXCEPTION 'activated role template mappings are immutable' USING ERRCODE = '55000';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
CREATE TRIGGER "role_template_allowed_scopes_draft_only" BEFORE INSERT OR UPDATE OR DELETE ON "role_template_allowed_scopes"
FOR EACH ROW EXECUTE FUNCTION "require_draft_role_template_mapping"();
CREATE TRIGGER "role_template_allowed_subjects_draft_only" BEFORE INSERT OR UPDATE OR DELETE ON "role_template_allowed_subjects"
FOR EACH ROW EXECUTE FUNCTION "require_draft_role_template_mapping"();
CREATE TRIGGER "role_template_capabilities_draft_only" BEFORE INSERT OR UPDATE OR DELETE ON "role_template_capabilities"
FOR EACH ROW EXECUTE FUNCTION "require_draft_role_template_mapping"();

CREATE FUNCTION "protect_service_principal_identity"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'service principals are revoked, not deleted' USING ERRCODE = '55000';
  END IF;
  IF NEW."environment" IS DISTINCT FROM OLD."environment" OR NEW."code" IS DISTINCT FROM OLD."code"
    OR NEW."purpose" IS DISTINCT FROM OLD."purpose" OR NEW."owner_user_id" IS DISTINCT FROM OLD."owner_user_id"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
    RAISE EXCEPTION 'service-principal identity facts are immutable' USING ERRCODE = '55000';
  END IF;
  IF NEW."credential_policy_version" < OLD."credential_policy_version"
    OR (OLD."last_rotated_at" IS NOT NULL AND NEW."last_rotated_at" < OLD."last_rotated_at") THEN
    RAISE EXCEPTION 'service-principal rotation evidence must be monotonic' USING ERRCODE = '55000';
  END IF;
  IF OLD."revoked_at" IS NOT NULL THEN
    RAISE EXCEPTION 'revoked service principal is immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "service_principals_immutable" BEFORE UPDATE OR DELETE ON "service_principals"
FOR EACH ROW EXECUTE FUNCTION "protect_service_principal_identity"();

CREATE FUNCTION "validate_role_assignment"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE template_status "role_template_status"; inactive_capabilities INTEGER; scope_retired TIMESTAMPTZ; scope_user UUID; principal_environment VARCHAR(20);
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'role assignments are revoked, not deleted' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW."subject_type" IS DISTINCT FROM OLD."subject_type" OR NEW."user_id" IS DISTINCT FROM OLD."user_id"
      OR NEW."service_principal_id" IS DISTINCT FROM OLD."service_principal_id"
      OR NEW."role_template_id" IS DISTINCT FROM OLD."role_template_id" OR NEW."scope_id" IS DISTINCT FROM OLD."scope_id"
      OR NEW."scope_type" IS DISTINCT FROM OLD."scope_type" OR NEW."valid_from" IS DISTINCT FROM OLD."valid_from"
      OR NEW."valid_until" IS DISTINCT FROM OLD."valid_until" OR NEW."granted_by_user_id" IS DISTINCT FROM OLD."granted_by_user_id"
      OR NEW."grant_reason" IS DISTINCT FROM OLD."grant_reason" OR NEW."granted_at" IS DISTINCT FROM OLD."granted_at" THEN
      RAISE EXCEPTION 'role assignment grant facts are immutable; revoke and create a successor' USING ERRCODE = '55000';
    END IF;
    IF OLD."revoked_at" IS NOT NULL THEN
      RAISE EXCEPTION 'revoked role assignment is immutable' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;
  SELECT "status" INTO template_status FROM "role_templates" WHERE "id" = NEW."role_template_id";
  IF template_status <> 'ACTIVE' THEN RAISE EXCEPTION 'new assignment requires an active template version' USING ERRCODE = '23514'; END IF;
  SELECT count(*) INTO inactive_capabilities FROM "role_template_capabilities" rtc
    JOIN "capabilities" c ON c."id" = rtc."capability_id"
    WHERE rtc."role_template_id" = NEW."role_template_id" AND c."retired_at" IS NOT NULL;
  IF inactive_capabilities > 0 THEN RAISE EXCEPTION 'new assignment cannot use retired capabilities' USING ERRCODE = '23514'; END IF;
  SELECT "retired_at", "user_id" INTO scope_retired, scope_user FROM "access_scopes" WHERE "id" = NEW."scope_id";
  IF scope_retired IS NOT NULL THEN RAISE EXCEPTION 'new assignment cannot use a retired scope' USING ERRCODE = '23514'; END IF;
  IF NEW."scope_type" = 'SELF' AND (NEW."subject_type" <> 'HUMAN' OR NEW."user_id" IS DISTINCT FROM scope_user) THEN
    RAISE EXCEPTION 'SELF scope belongs only to its exact human user' USING ERRCODE = '23514';
  END IF;
  IF NEW."subject_type" = 'SERVICE_PRINCIPAL' THEN
    SELECT "environment" INTO principal_environment FROM "service_principals" WHERE "id" = NEW."service_principal_id" AND "revoked_at" IS NULL;
    IF principal_environment IS NULL THEN RAISE EXCEPTION 'assignment requires a current service principal' USING ERRCODE = '23514'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "role_assignments_authority_guard" BEFORE INSERT OR UPDATE OR DELETE ON "role_assignments"
FOR EACH ROW EXECUTE FUNCTION "validate_role_assignment"();

CREATE FUNCTION "protect_approval_request"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'approval requests are retained, not deleted' USING ERRCODE = '55000';
  END IF;
  IF NEW."operation" IS DISTINCT FROM OLD."operation" OR NEW."subject_type" IS DISTINCT FROM OLD."subject_type"
    OR NEW."target_user_id" IS DISTINCT FROM OLD."target_user_id"
    OR NEW."target_service_principal_id" IS DISTINCT FROM OLD."target_service_principal_id"
    OR NEW."role_template_id" IS DISTINCT FROM OLD."role_template_id" OR NEW."scope_id" IS DISTINCT FROM OLD."scope_id"
    OR NEW."scope_type" IS DISTINCT FROM OLD."scope_type" OR NEW."requested_valid_from" IS DISTINCT FROM OLD."requested_valid_from"
    OR NEW."requested_valid_until" IS DISTINCT FROM OLD."requested_valid_until"
    OR NEW."requested_by_user_id" IS DISTINCT FROM OLD."requested_by_user_id" OR NEW."reason" IS DISTINCT FROM OLD."reason"
    OR NEW."expires_at" IS DISTINCT FROM OLD."expires_at" OR NEW."idempotency_key" IS DISTINCT FROM OLD."idempotency_key"
    OR NEW."independent_approval_required" IS DISTINCT FROM OLD."independent_approval_required"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
    RAISE EXCEPTION 'approval request facts are immutable' USING ERRCODE = '55000';
  END IF;
  IF OLD."state" <> 'PENDING' OR NEW."state" = OLD."state" OR NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'approval request state transition is not current' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "approval_requests_immutable_facts" BEFORE UPDATE OR DELETE ON "approval_requests"
FOR EACH ROW EXECUTE FUNCTION "protect_approval_request"();

CREATE FUNCTION "validate_approval_decision"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE request_row "approval_requests"%ROWTYPE; template_row "role_templates"%ROWTYPE;
  session_status "session_status"; session_revoked_at TIMESTAMPTZ; session_idle_expires_at TIMESTAMPTZ;
  session_absolute_expires_at TIMESTAMPTZ; session_issued_security_version INTEGER;
  session_password_authenticated_at TIMESTAMPTZ; session_mfa_verified_at TIMESTAMPTZ;
  session_mfa_method "mfa_method"; session_mfa_factor_id UUID;
  user_security_version INTEGER; active_factor_status "mfa_factor_status"; contact_verified BOOLEAN;
BEGIN
  SELECT * INTO request_row FROM "approval_requests" WHERE "id" = NEW."approval_request_id" FOR UPDATE;
  IF request_row."state" <> 'PENDING' OR request_row."expires_at" <= NEW."assurance_evaluated_at" THEN
    RAISE EXCEPTION 'approval request is not pending and current' USING ERRCODE = '23514';
  END IF;
  IF request_row."independent_approval_required" AND request_row."requested_by_user_id" = NEW."approver_user_id" THEN
    RAISE EXCEPTION 'requestor cannot approve their own request' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO template_row FROM "role_templates" WHERE "id" = request_row."role_template_id";
  IF template_row."privilege_class" = 'PRIVILEGED' AND request_row."target_user_id" = NEW."approver_user_id" THEN
    RAISE EXCEPTION 'target user cannot approve their own privileged grant' USING ERRCODE = '23514';
  END IF;
  SELECT s."status", s."revoked_at", s."idle_expires_at", s."absolute_expires_at", s."issued_security_version",
      s."password_authenticated_at", s."mfa_verified_at", s."mfa_method", s."mfa_factor_id", u."security_version"
    INTO session_status, session_revoked_at, session_idle_expires_at, session_absolute_expires_at,
      session_issued_security_version, session_password_authenticated_at, session_mfa_verified_at,
      session_mfa_method, session_mfa_factor_id, user_security_version
    FROM "sessions" s JOIN "users" u ON u."id" = s."user_id"
    WHERE s."id" = NEW."session_id" AND s."user_id" = NEW."approver_user_id" AND u."status" = 'ACTIVE';
  IF session_status IS NULL OR session_status <> 'ACTIVE' OR session_revoked_at IS NOT NULL
    OR session_idle_expires_at <= NEW."assurance_evaluated_at" OR session_absolute_expires_at <= NEW."assurance_evaluated_at"
    OR session_issued_security_version <> user_security_version OR NEW."security_version" <> user_security_version
    OR NEW."password_authenticated_at" IS DISTINCT FROM session_password_authenticated_at
    OR NEW."mfa_verified_at" IS DISTINCT FROM session_mfa_verified_at
    OR NEW."mfa_method" IS DISTINCT FROM session_mfa_method
    OR NEW."mfa_factor_id" IS DISTINCT FROM session_mfa_factor_id THEN
    RAISE EXCEPTION 'approval assurance snapshot is not authoritative' USING ERRCODE = '23514';
  END IF;
  SELECT EXISTS (SELECT 1 FROM "user_emails" e WHERE e."user_id" = NEW."approver_user_id" AND e."verified_at" IS NOT NULL AND e."primary_at" IS NOT NULL AND e."retired_at" IS NULL) INTO contact_verified;
  IF template_row."require_contact_verified" AND NOT contact_verified THEN RAISE EXCEPTION 'approval requires verified contact' USING ERRCODE = '23514'; END IF;
  IF template_row."password_max_age_milliseconds" IS NOT NULL AND (
    NEW."password_authenticated_at" IS NULL OR NEW."password_authenticated_at" > NEW."assurance_evaluated_at"
    OR NEW."password_authenticated_at" + (template_row."password_max_age_milliseconds" * interval '1 millisecond') <= NEW."assurance_evaluated_at"
  ) THEN RAISE EXCEPTION 'approval requires recent password authentication' USING ERRCODE = '23514'; END IF;
  IF template_row."mfa_max_age_milliseconds" IS NOT NULL THEN
    SELECT "status" INTO active_factor_status FROM "mfa_factors" WHERE "id" = NEW."mfa_factor_id" AND "user_id" = NEW."approver_user_id";
    IF NEW."mfa_verified_at" IS NULL OR NEW."mfa_verified_at" > NEW."assurance_evaluated_at"
      OR NEW."mfa_verified_at" + (template_row."mfa_max_age_milliseconds" * interval '1 millisecond') <= NEW."assurance_evaluated_at"
      OR active_factor_status <> 'ACTIVE' THEN RAISE EXCEPTION 'approval requires current MFA proof' USING ERRCODE = '23514'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "approval_decisions_authority_guard" BEFORE INSERT ON "approval_decisions"
FOR EACH ROW EXECUTE FUNCTION "validate_approval_decision"();

CREATE FUNCTION "reject_approval_decision_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'approval decisions are append-only' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER "approval_decisions_append_only" BEFORE UPDATE OR DELETE ON "approval_decisions"
FOR EACH ROW EXECUTE FUNCTION "reject_approval_decision_mutation"();

CREATE FUNCTION "validate_temporary_access_grant"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE assignment_row "role_assignments"%ROWTYPE; privilege "access_privilege_class"; approval_row "approval_requests"%ROWTYPE;
BEGIN
  SELECT * INTO assignment_row FROM "role_assignments" WHERE "id" = NEW."role_assignment_id";
  IF assignment_row."valid_until" IS NULL THEN RAISE EXCEPTION 'temporary access requires finite expiry' USING ERRCODE = '23514'; END IF;
  IF assignment_row."scope_type" = 'PLATFORM' THEN RAISE EXCEPTION 'temporary PLATFORM access is prohibited' USING ERRCODE = '23514'; END IF;
  SELECT "privilege_class" INTO privilege FROM "role_templates" WHERE "id" = assignment_row."role_template_id";
  IF privilege = 'PRIVILEGED' THEN
    IF NEW."approval_request_id" IS NULL THEN RAISE EXCEPTION 'privileged temporary access requires approval evidence' USING ERRCODE = '23514'; END IF;
    SELECT * INTO approval_row FROM "approval_requests" WHERE "id" = NEW."approval_request_id";
    IF approval_row."state" <> 'APPROVED' OR approval_row."operation" <> 'TEMPORARY_ACCESS_GRANT'
      OR approval_row."role_template_id" <> assignment_row."role_template_id"
      OR approval_row."scope_id" <> assignment_row."scope_id"
      OR approval_row."subject_type" <> assignment_row."subject_type"
      OR approval_row."target_user_id" IS DISTINCT FROM assignment_row."user_id"
      OR approval_row."target_service_principal_id" IS DISTINCT FROM assignment_row."service_principal_id" THEN
      RAISE EXCEPTION 'temporary access approval does not match the assignment' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "temporary_access_grants_authority_guard" BEFORE INSERT OR UPDATE ON "temporary_access_grants"
FOR EACH ROW EXECUTE FUNCTION "validate_temporary_access_grant"();

CREATE FUNCTION "reject_temporary_access_grant_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'temporary access grant metadata is immutable' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER "temporary_access_grants_immutable" BEFORE UPDATE OR DELETE ON "temporary_access_grants"
FOR EACH ROW EXECUTE FUNCTION "reject_temporary_access_grant_mutation"();

INSERT INTO "capabilities" ("id", "code", "description") VALUES
  ('10000000-0000-4000-8000-000000000001', 'access.assignment.read', 'Read exact scoped assignment facts'),
  ('10000000-0000-4000-8000-000000000002', 'access.assignment.request', 'Request an exact scoped assignment'),
  ('10000000-0000-4000-8000-000000000003', 'access.assignment.grant', 'Grant an approved exact scoped assignment'),
  ('10000000-0000-4000-8000-000000000004', 'access.assignment.revoke', 'Revoke an exact scoped assignment'),
  ('10000000-0000-4000-8000-000000000005', 'access.approval.read', 'Read bounded Access approval evidence'),
  ('10000000-0000-4000-8000-000000000006', 'access.approval.decide', 'Record a bounded Access approval decision'),
  ('10000000-0000-4000-8000-000000000007', 'access.temporary.request', 'Request finite scoped temporary access'),
  ('10000000-0000-4000-8000-000000000008', 'access.temporary.grant', 'Grant approved finite scoped temporary access'),
  ('10000000-0000-4000-8000-000000000009', 'access.temporary.revoke', 'Revoke finite scoped temporary access'),
  ('10000000-0000-4000-8000-000000000010', 'access.service-principal.read', 'Read service-principal identity metadata'),
  ('10000000-0000-4000-8000-000000000011', 'access.service-principal.create', 'Create bounded service-principal identity metadata'),
  ('10000000-0000-4000-8000-000000000012', 'access.service-principal.rotate', 'Record service-principal credential rotation evidence'),
  ('10000000-0000-4000-8000-000000000013', 'access.service-principal.revoke', 'Revoke a service-principal identity');
