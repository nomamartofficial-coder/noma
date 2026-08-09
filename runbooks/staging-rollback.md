# Staging rollback runbook

## Application rollback

1. Record incident/change owner, staging service, current and target commit, migration history, and UTC time without credentials.
2. Disable automatic staging deploys while the decision is active.
3. Confirm the prior Web/API/Worker version is compatible with the already-applied schema and queue envelope versions.
4. Select the prior reviewed Vercel Preview or Render deployment. Never run reset, `db push`, reverse SQL, or edit an applied migration.
5. Recheck API liveness/readiness, Worker database/queue readiness, exact CORS origin, environment, and release identity.
6. Run the bounded deployment smoke and create redacted evidence.
7. Re-enable `checksPass` deployment only after human review.

If schema incompatibility prevents application rollback, stop traffic and choose a reviewed forward fix or approved isolated database restore. Provider code rollback is not database rollback.

## Resource teardown

Teardown requires explicit authorization and exact target confirmation. Disable Vercel Git deployment, remove the Preview project if approved, and remove only `noma-api-staging`, `noma-worker-staging`, `noma-key-value-staging`, and `noma-postgres-staging` in the `noma/staging` Render environment. Confirm no production resource, domain, provider account, data, or credential was touched. Record whether the provider can recover each deletion; assume datastore deletion is irreversible unless provider evidence says otherwise.
