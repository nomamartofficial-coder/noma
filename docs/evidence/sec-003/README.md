# SEC-003 synthetic verification evidence

This directory is reserved for non-secret SEC-003 review evidence. Unit tests use synthetic `noma:mfa-seed` bindings and a test-only key provider; PostgreSQL integration tests use isolated Testcontainers infrastructure and confirm plaintext does not appear in the persisted envelope. Mocked AWS KMS command tests do not contact AWS.

The task verification command is `pnpm security:encryption:verify`. Canonical local checks and the five GitHub gate run IDs belong in the draft PR. Do not commit plaintext seeds, DEKs, KMS responses, OIDC token paths, credentials, production identifiers, database URLs, or raw log captures here. No production activation or real AWS contract test is claimed.
