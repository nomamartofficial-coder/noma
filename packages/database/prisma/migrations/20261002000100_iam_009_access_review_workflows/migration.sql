-- IAM-009 is additive. Historical IAM-005 approval facts and IAM-008 audit rows remain untouched.
CREATE TYPE "access_review_cadence" AS ENUM ('MONTHLY', 'QUARTERLY', 'EVENT_DRIVEN');
CREATE TYPE "access_review_outcome" AS ENUM ('RETAIN_CONFIRMED', 'REVOKE_REQUESTED', 'NEEDS_FOLLOW_UP');

INSERT INTO "capabilities" ("id", "code", "description") VALUES
  ('10000000-0000-4000-8000-000000000015', 'access.review.read', 'Read exact scoped Access review items'),
  ('10000000-0000-4000-8000-000000000016', 'access.review.attest', 'Attest exact scoped Access review items'),
  ('10000000-0000-4000-8000-000000000017', 'access.review.export', 'Request and execute bounded scoped Access review export');

CREATE TABLE "access_approval_revocation_targets" (
  "approval_request_id" UUID NOT NULL PRIMARY KEY REFERENCES "approval_requests"("id") ON DELETE RESTRICT,
  "role_assignment_id" UUID NOT NULL REFERENCES "role_assignments"("id") ON DELETE RESTRICT,
  "expected_version" INTEGER NOT NULL CHECK ("expected_version" >= 0)
);
CREATE INDEX "access_revocation_targets_assignment_version_idx" ON "access_approval_revocation_targets"("role_assignment_id", "expected_version");

CREATE TABLE "access_approval_effects" (
  "id" UUID NOT NULL PRIMARY KEY,
  "approval_request_id" UUID NOT NULL CONSTRAINT "access_approval_effects_request_key" UNIQUE REFERENCES "approval_requests"("id") ON DELETE RESTRICT,
  "operation" "access_approval_operation" NOT NULL,
  "role_assignment_id" UUID NOT NULL REFERENCES "role_assignments"("id") ON DELETE RESTRICT,
  "idempotency_key" VARCHAR(160) NOT NULL,
  "executed_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "executed_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "access_approval_effects_executor_key" UNIQUE ("executed_by_user_id", "idempotency_key"),
  CONSTRAINT "access_approval_effects_key_check" CHECK ("idempotency_key" = btrim("idempotency_key") AND length("idempotency_key") > 0)
);

CREATE TABLE "access_review_cycles" (
  "id" UUID NOT NULL PRIMARY KEY,
  "scope_id" UUID NOT NULL REFERENCES "access_scopes"("id") ON DELETE RESTRICT,
  "cadence" "access_review_cadence" NOT NULL,
  "event_code" VARCHAR(80),
  "opens_at" TIMESTAMPTZ(6) NOT NULL,
  "due_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "access_review_cycles_time_check" CHECK ("due_at" > "opens_at"),
  CONSTRAINT "access_review_cycles_event_check" CHECK (("cadence" = 'EVENT_DRIVEN' AND "event_code" IS NOT NULL AND "event_code" ~ '^[A-Z][A-Z0-9_]*$') OR ("cadence" <> 'EVENT_DRIVEN' AND "event_code" IS NULL))
);
CREATE INDEX "access_review_cycles_scope_due_idx" ON "access_review_cycles"("scope_id", "due_at", "id");

CREATE TABLE "access_review_items" (
  "id" UUID NOT NULL PRIMARY KEY,
  "cycle_id" UUID NOT NULL REFERENCES "access_review_cycles"("id") ON DELETE RESTRICT,
  "role_assignment_id" UUID NOT NULL REFERENCES "role_assignments"("id") ON DELETE RESTRICT,
  "assignment_version" INTEGER NOT NULL,
  "outcome" "access_review_outcome",
  "completed_at" TIMESTAMPTZ(6),
  "revocation_request_id" UUID REFERENCES "approval_requests"("id") ON DELETE RESTRICT,
  "version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "access_review_items_cycle_assignment_key" UNIQUE ("cycle_id", "role_assignment_id"),
  CONSTRAINT "access_review_items_version_check" CHECK ("assignment_version" >= 0 AND "version" >= 0),
  CONSTRAINT "access_review_items_completion_check" CHECK (("outcome" IS NULL OR "outcome" = 'NEEDS_FOLLOW_UP') AND "completed_at" IS NULL OR ("outcome" IN ('RETAIN_CONFIRMED', 'REVOKE_REQUESTED') AND "completed_at" IS NOT NULL)),
  CONSTRAINT "access_review_items_revocation_check" CHECK (("outcome" IS NOT DISTINCT FROM 'REVOKE_REQUESTED'::"access_review_outcome") = ("revocation_request_id" IS NOT NULL))
);
CREATE INDEX "access_review_items_cycle_completion_idx" ON "access_review_items"("cycle_id", "completed_at", "id");

CREATE TABLE "access_review_attestations" (
  "id" UUID NOT NULL PRIMARY KEY,
  "item_id" UUID NOT NULL REFERENCES "access_review_items"("id") ON DELETE RESTRICT,
  "reviewer_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "outcome" "access_review_outcome" NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "item_version" INTEGER NOT NULL,
  "attested_at" TIMESTAMPTZ(6) NOT NULL,
  "operation_id" VARCHAR(160) NOT NULL,
  CONSTRAINT "access_review_attestations_operation_key" UNIQUE ("reviewer_user_id", "operation_id"),
  CONSTRAINT "access_review_attestations_item_version_key" UNIQUE ("item_id", "item_version"),
  CONSTRAINT "access_review_attestations_text_check" CHECK ("reason" = btrim("reason") AND length("reason") > 0 AND "operation_id" = btrim("operation_id") AND length("operation_id") > 0 AND "item_version" >= 0)
);

CREATE TABLE "access_review_export_requests" (
  "id" UUID NOT NULL PRIMARY KEY,
  "scope_id" UUID NOT NULL REFERENCES "access_scopes"("id") ON DELETE RESTRICT,
  "projection_id" VARCHAR(100) NOT NULL,
  "filter_category" VARCHAR(40) NOT NULL,
  "row_ceiling" INTEGER NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "requested_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "idempotency_key" VARCHAR(160) NOT NULL,
  "state" "access_approval_state" NOT NULL DEFAULT 'PENDING',
  "version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "access_review_export_requests_requestor_key" UNIQUE ("requested_by_user_id", "idempotency_key"),
  CONSTRAINT "access_review_export_requests_projection_check" CHECK ("projection_id" = 'access.review.export.row.v1'),
  CONSTRAINT "access_review_export_requests_filter_check" CHECK ("filter_category" IN ('ALL', 'DUE', 'OVERDUE', 'COMPLETED', 'UNRESOLVED')),
  CONSTRAINT "access_review_export_requests_ceiling_check" CHECK ("row_ceiling" BETWEEN 1 AND 500),
  CONSTRAINT "access_review_export_requests_text_check" CHECK ("reason" = btrim("reason") AND length("reason") > 0 AND "idempotency_key" = btrim("idempotency_key") AND length("idempotency_key") > 0),
  CONSTRAINT "access_review_export_requests_time_check" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "access_review_export_requests_version_check" CHECK ("version" >= 0)
);
CREATE INDEX "access_review_export_requests_scope_state_idx" ON "access_review_export_requests"("scope_id", "state", "expires_at", "id");

CREATE TABLE "access_review_export_decisions" (
  "id" UUID NOT NULL PRIMARY KEY,
  "request_id" UUID NOT NULL REFERENCES "access_review_export_requests"("id") ON DELETE RESTRICT,
  "approver_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "decision" "access_approval_decision_value" NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "session_id" UUID NOT NULL REFERENCES "sessions"("id") ON DELETE RESTRICT,
  "security_version" INTEGER NOT NULL,
  "decided_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "access_review_export_decisions_request_key" UNIQUE ("request_id"),
  CONSTRAINT "access_review_export_decisions_reason_check" CHECK ("reason" = btrim("reason") AND length("reason") > 0 AND "security_version" >= 0)
);

CREATE TABLE "access_review_export_effects" (
  "id" UUID NOT NULL PRIMARY KEY,
  "request_id" UUID NOT NULL CONSTRAINT "access_review_export_effects_request_key" UNIQUE REFERENCES "access_review_export_requests"("id") ON DELETE RESTRICT,
  "executed_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "result_count" INTEGER NOT NULL,
  "operation_id" VARCHAR(160) NOT NULL,
  "executed_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "access_review_export_effects_executor_operation_key" UNIQUE ("executed_by_user_id", "operation_id"),
  CONSTRAINT "access_review_export_effects_result_check" CHECK ("result_count" BETWEEN 0 AND 500),
  CONSTRAINT "access_review_export_effects_operation_check" CHECK ("operation_id" = btrim("operation_id") AND length("operation_id") > 0)
);

-- New historical evidence is immutable; it is never deleted to hide a decision or effect.
CREATE FUNCTION "reject_iam009_evidence_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'IAM-009 evidence is append-only' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER "access_approval_revocation_targets_immutable" BEFORE UPDATE OR DELETE ON "access_approval_revocation_targets" FOR EACH ROW EXECUTE FUNCTION "reject_iam009_evidence_mutation"();
CREATE TRIGGER "access_approval_effects_immutable" BEFORE UPDATE OR DELETE ON "access_approval_effects" FOR EACH ROW EXECUTE FUNCTION "reject_iam009_evidence_mutation"();
CREATE TRIGGER "access_review_attestations_immutable" BEFORE UPDATE OR DELETE ON "access_review_attestations" FOR EACH ROW EXECUTE FUNCTION "reject_iam009_evidence_mutation"();
CREATE TRIGGER "access_review_export_decisions_immutable" BEFORE UPDATE OR DELETE ON "access_review_export_decisions" FOR EACH ROW EXECUTE FUNCTION "reject_iam009_evidence_mutation"();
CREATE TRIGGER "access_review_export_effects_immutable" BEFORE UPDATE OR DELETE ON "access_review_export_effects" FOR EACH ROW EXECUTE FUNCTION "reject_iam009_evidence_mutation"();
CREATE TRIGGER "access_review_cycles_immutable" BEFORE UPDATE OR DELETE ON "access_review_cycles" FOR EACH ROW EXECUTE FUNCTION "reject_iam009_evidence_mutation"();
CREATE TRIGGER "access_approval_revocation_targets_reject_truncate" BEFORE TRUNCATE ON "access_approval_revocation_targets" FOR EACH STATEMENT EXECUTE FUNCTION "reject_iam009_evidence_mutation"();
CREATE TRIGGER "access_approval_effects_reject_truncate" BEFORE TRUNCATE ON "access_approval_effects" FOR EACH STATEMENT EXECUTE FUNCTION "reject_iam009_evidence_mutation"();
CREATE TRIGGER "access_review_cycles_reject_truncate" BEFORE TRUNCATE ON "access_review_cycles" FOR EACH STATEMENT EXECUTE FUNCTION "reject_iam009_evidence_mutation"();
CREATE TRIGGER "access_review_items_reject_truncate" BEFORE TRUNCATE ON "access_review_items" FOR EACH STATEMENT EXECUTE FUNCTION "reject_iam009_evidence_mutation"();
CREATE TRIGGER "access_review_attestations_reject_truncate" BEFORE TRUNCATE ON "access_review_attestations" FOR EACH STATEMENT EXECUTE FUNCTION "reject_iam009_evidence_mutation"();
CREATE TRIGGER "access_review_export_requests_reject_truncate" BEFORE TRUNCATE ON "access_review_export_requests" FOR EACH STATEMENT EXECUTE FUNCTION "reject_iam009_evidence_mutation"();
CREATE TRIGGER "access_review_export_decisions_reject_truncate" BEFORE TRUNCATE ON "access_review_export_decisions" FOR EACH STATEMENT EXECUTE FUNCTION "reject_iam009_evidence_mutation"();
CREATE TRIGGER "access_review_export_effects_reject_truncate" BEFORE TRUNCATE ON "access_review_export_effects" FOR EACH STATEMENT EXECUTE FUNCTION "reject_iam009_evidence_mutation"();

CREATE FUNCTION "validate_access_revocation_target"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE request_row "approval_requests"%ROWTYPE; assignment_row "role_assignments"%ROWTYPE;
BEGIN
  SELECT * INTO request_row FROM "approval_requests" WHERE "id" = NEW."approval_request_id";
  SELECT * INTO assignment_row FROM "role_assignments" WHERE "id" = NEW."role_assignment_id";
  IF request_row."operation" NOT IN ('ASSIGNMENT_REVOKE', 'TEMPORARY_ACCESS_REVOKE')
    OR assignment_row."version" <> NEW."expected_version"
    OR assignment_row."role_template_id" <> request_row."role_template_id"
    OR assignment_row."scope_id" <> request_row."scope_id"
    OR assignment_row."scope_type" <> request_row."scope_type"
    OR assignment_row."subject_type" <> request_row."subject_type"
    OR assignment_row."user_id" IS DISTINCT FROM request_row."target_user_id"
    OR assignment_row."service_principal_id" IS DISTINCT FROM request_row."target_service_principal_id"
    OR assignment_row."valid_from" <> request_row."requested_valid_from"
    OR assignment_row."valid_until" IS DISTINCT FROM request_row."requested_valid_until"
    OR assignment_row."revoked_at" IS NOT NULL THEN
    RAISE EXCEPTION 'revocation target must match the exact current assignment and request' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "access_revocation_target_guard" BEFORE INSERT ON "access_approval_revocation_targets" FOR EACH ROW EXECUTE FUNCTION "validate_access_revocation_target"();

CREATE FUNCTION "validate_access_approval_effect"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE request_row "approval_requests"%ROWTYPE; assignment_row "role_assignments"%ROWTYPE;
BEGIN
  SELECT * INTO request_row FROM "approval_requests" WHERE "id" = NEW."approval_request_id" FOR UPDATE;
  SELECT * INTO assignment_row FROM "role_assignments" WHERE "id" = NEW."role_assignment_id";
  IF request_row."state" <> 'APPROVED' OR request_row."expires_at" <= NEW."executed_at"
    OR request_row."operation" <> NEW."operation" OR assignment_row."id" IS NULL
    OR assignment_row."role_template_id" <> request_row."role_template_id"
    OR assignment_row."scope_id" <> request_row."scope_id"
    OR assignment_row."scope_type" <> request_row."scope_type"
    OR assignment_row."subject_type" <> request_row."subject_type"
    OR assignment_row."user_id" IS DISTINCT FROM request_row."target_user_id"
    OR assignment_row."service_principal_id" IS DISTINCT FROM request_row."target_service_principal_id"
    OR assignment_row."valid_from" IS DISTINCT FROM request_row."requested_valid_from"
    OR assignment_row."valid_until" IS DISTINCT FROM request_row."requested_valid_until"
    OR NOT EXISTS (SELECT 1 FROM "approval_decisions" d WHERE d."approval_request_id" = NEW."approval_request_id" AND d."decision" = 'APPROVE') THEN
    RAISE EXCEPTION 'approval effect requires exact current approved request and assignment' USING ERRCODE = '23514';
  END IF;
  IF NEW."operation" IN ('ASSIGNMENT_REVOKE', 'TEMPORARY_ACCESS_REVOKE') AND NOT EXISTS (
    SELECT 1 FROM "access_approval_revocation_targets" t
    WHERE t."approval_request_id" = NEW."approval_request_id" AND t."role_assignment_id" = NEW."role_assignment_id"
      AND assignment_row."version" = t."expected_version" + 1 AND assignment_row."revoked_at" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'revocation effect requires exact target' USING ERRCODE = '23514';
  END IF;
  IF NEW."operation" IN ('ASSIGNMENT_GRANT', 'TEMPORARY_ACCESS_GRANT')
    AND (assignment_row."version" <> 0 OR assignment_row."revoked_at" IS NOT NULL
      OR assignment_row."granted_by_user_id" <> NEW."executed_by_user_id"
      OR assignment_row."granted_at" IS DISTINCT FROM NEW."executed_at") THEN
    RAISE EXCEPTION 'grant effect requires the exact newly granted assignment' USING ERRCODE = '23514';
  END IF;
  IF NEW."operation" = 'TEMPORARY_ACCESS_GRANT' AND (
    assignment_row."valid_until" IS NULL OR NOT EXISTS (
      SELECT 1 FROM "temporary_access_grants" t WHERE t."role_assignment_id" = NEW."role_assignment_id"
        AND t."approval_request_id" = NEW."approval_request_id"
    )) THEN
    RAISE EXCEPTION 'temporary grant effect requires finite matching temporary evidence' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "access_approval_effect_guard" BEFORE INSERT ON "access_approval_effects" FOR EACH ROW EXECUTE FUNCTION "validate_access_approval_effect"();

CREATE FUNCTION "validate_access_review_item"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cycle_scope UUID; assignment_scope UUID; current_version INTEGER;
BEGIN
  SELECT "scope_id" INTO cycle_scope FROM "access_review_cycles" WHERE "id" = NEW."cycle_id";
  SELECT "scope_id", "version" INTO assignment_scope, current_version FROM "role_assignments" WHERE "id" = NEW."role_assignment_id";
  IF cycle_scope IS DISTINCT FROM assignment_scope OR current_version IS DISTINCT FROM NEW."assignment_version"
    OR NEW."outcome" IS NOT NULL OR NEW."completed_at" IS NOT NULL OR NEW."revocation_request_id" IS NOT NULL OR NEW."version" <> 0 THEN
    RAISE EXCEPTION 'review item must start pending for exact assignment snapshot and scope' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "access_review_item_insert_guard" BEFORE INSERT ON "access_review_items" FOR EACH ROW EXECUTE FUNCTION "validate_access_review_item"();

CREATE FUNCTION "protect_access_review_item"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE attestation_row "access_review_attestations"%ROWTYPE; revocation_row "approval_requests"%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'review items are retained' USING ERRCODE = '55000'; END IF;
  IF NEW."cycle_id" IS DISTINCT FROM OLD."cycle_id" OR NEW."role_assignment_id" IS DISTINCT FROM OLD."role_assignment_id"
    OR NEW."assignment_version" IS DISTINCT FROM OLD."assignment_version" OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
    OR OLD."completed_at" IS NOT NULL OR NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'review item facts or completed decision cannot be rewritten' USING ERRCODE = '55000';
  END IF;
  SELECT * INTO attestation_row FROM "access_review_attestations"
    WHERE "item_id" = OLD."id" AND "item_version" = OLD."version";
  IF attestation_row."id" IS NULL OR NEW."outcome" IS DISTINCT FROM attestation_row."outcome"
    OR (NEW."completed_at" IS NOT NULL) IS DISTINCT FROM (NEW."outcome" IN ('RETAIN_CONFIRMED', 'REVOKE_REQUESTED'))
    OR (NEW."completed_at" IS NOT NULL AND NEW."completed_at" IS DISTINCT FROM attestation_row."attested_at") THEN
    RAISE EXCEPTION 'review item transition requires matching immutable attestation' USING ERRCODE = '23514';
  END IF;
  IF NEW."outcome" = 'REVOKE_REQUESTED' THEN
    SELECT * INTO revocation_row FROM "approval_requests" WHERE "id" = NEW."revocation_request_id";
    IF revocation_row."operation" NOT IN ('ASSIGNMENT_REVOKE', 'TEMPORARY_ACCESS_REVOKE')
      OR NOT EXISTS (SELECT 1 FROM "access_approval_revocation_targets" t
        WHERE t."approval_request_id" = NEW."revocation_request_id" AND t."role_assignment_id" = NEW."role_assignment_id") THEN
      RAISE EXCEPTION 'revoke-requested review requires a linked exact approval-backed revocation' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "access_review_items_guard" BEFORE UPDATE OR DELETE ON "access_review_items" FOR EACH ROW EXECUTE FUNCTION "protect_access_review_item"();

CREATE FUNCTION "validate_access_review_attestation"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item_row "access_review_items"%ROWTYPE; current_version INTEGER;
BEGIN
  SELECT * INTO item_row FROM "access_review_items" WHERE "id" = NEW."item_id" FOR UPDATE;
  SELECT "version" INTO current_version FROM "role_assignments" WHERE "id" = item_row."role_assignment_id";
  IF item_row."completed_at" IS NOT NULL OR item_row."version" <> NEW."item_version"
    OR item_row."assignment_version" IS DISTINCT FROM current_version THEN
    RAISE EXCEPTION 'review attestation requires unresolved current item and assignment' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "access_review_attestation_guard" BEFORE INSERT ON "access_review_attestations" FOR EACH ROW EXECUTE FUNCTION "validate_access_review_attestation"();

CREATE FUNCTION "protect_access_review_export_request"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'export requests are retained' USING ERRCODE = '55000'; END IF;
  IF NEW."scope_id" IS DISTINCT FROM OLD."scope_id" OR NEW."projection_id" IS DISTINCT FROM OLD."projection_id"
    OR NEW."filter_category" IS DISTINCT FROM OLD."filter_category" OR NEW."row_ceiling" IS DISTINCT FROM OLD."row_ceiling"
    OR NEW."reason" IS DISTINCT FROM OLD."reason" OR NEW."requested_by_user_id" IS DISTINCT FROM OLD."requested_by_user_id"
    OR NEW."expires_at" IS DISTINCT FROM OLD."expires_at" OR NEW."idempotency_key" IS DISTINCT FROM OLD."idempotency_key"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at" OR OLD."state" <> 'PENDING'
    OR NEW."state" = OLD."state" OR NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'export request facts are immutable and state transition must be current' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "access_review_export_requests_guard" BEFORE UPDATE OR DELETE ON "access_review_export_requests" FOR EACH ROW EXECUTE FUNCTION "protect_access_review_export_request"();

CREATE FUNCTION "validate_access_review_export_decision"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE request_row "access_review_export_requests"%ROWTYPE; session_row "sessions"%ROWTYPE; user_version INTEGER;
BEGIN
  SELECT * INTO request_row FROM "access_review_export_requests" WHERE "id" = NEW."request_id" FOR UPDATE;
  SELECT * INTO session_row FROM "sessions" WHERE "id" = NEW."session_id";
  SELECT "security_version" INTO user_version FROM "users" WHERE "id" = NEW."approver_user_id" AND "status" = 'ACTIVE';
  IF request_row."state" <> 'PENDING' OR request_row."expires_at" <= NEW."decided_at"
    OR request_row."requested_by_user_id" = NEW."approver_user_id"
    OR session_row."user_id" IS DISTINCT FROM NEW."approver_user_id" OR session_row."status" <> 'ACTIVE'
    OR session_row."revoked_at" IS NOT NULL OR session_row."idle_expires_at" <= NEW."decided_at"
    OR session_row."absolute_expires_at" <= NEW."decided_at"
    OR session_row."issued_security_version" IS DISTINCT FROM user_version
    OR NEW."security_version" IS DISTINCT FROM user_version
    OR session_row."assurance" <> 'PRIVILEGED_MFA_RECENT'
    OR session_row."mfa_verified_at" IS NULL OR session_row."mfa_verified_at" + interval '5 minutes' <= NEW."decided_at" THEN
    RAISE EXCEPTION 'export decision requires current independent privileged approver' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "access_review_export_decision_guard" BEFORE INSERT ON "access_review_export_decisions" FOR EACH ROW EXECUTE FUNCTION "validate_access_review_export_decision"();

CREATE FUNCTION "validate_access_review_export_effect"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE request_row "access_review_export_requests"%ROWTYPE;
BEGIN
  SELECT * INTO request_row FROM "access_review_export_requests" WHERE "id" = NEW."request_id" FOR UPDATE;
  IF request_row."state" <> 'APPROVED' OR request_row."expires_at" <= NEW."executed_at"
    OR NEW."result_count" > request_row."row_ceiling"
    OR NOT EXISTS (SELECT 1 FROM "access_review_export_decisions" d WHERE d."request_id" = NEW."request_id" AND d."decision" = 'APPROVE') THEN
    RAISE EXCEPTION 'export effect requires current approved bounded request' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "access_review_export_effect_guard" BEFORE INSERT ON "access_review_export_effects" FOR EACH ROW EXECUTE FUNCTION "validate_access_review_export_effect"();
