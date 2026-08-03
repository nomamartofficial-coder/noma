# Staging deployment runbook

## Preconditions

- DEV-009 is merged after Engineering, QA, Security, Data, and applicable DevOps review.
- All five stable GitHub gates pass on the exact commit.
- Organization-controlled Vercel and Render accounts, MFA, owners, current plans, and explicit cost authorization are recorded.
- The protected Vercel preview origin is selected; production domains and resources do not exist.
- No production data or credential is used.
- An authenticated disposable provider probe has proved that the Render private PostgreSQL endpoint negotiates the wrapper's required TLS mode, or Security has approved another private and encrypted design.

## Procedure

1. Run `pnpm deploy:verify` locally and record the reviewed commit SHA.
2. Import the Vercel project from repository root with [vercel.json](../vercel.json). Configure Preview only: `NEXT_PUBLIC_NOMA_ENV=preview` and `NEXT_PUBLIC_API_BASE_URL=https://noma-api-staging.onrender.com`. Enable Vercel Authentication. Confirm `main` deployment is disabled and no production domain exists.
3. Review the current Render quote and the recorded private-PostgreSQL/TLS compatibility evidence, then import [render.yaml](../render.yaml) only after both approvals.
4. In Render, set the exact protected preview URL as API `PUBLIC_WEB_ORIGIN` and a new 32+ character staging-only `SESSION_SECRET`.
5. Enable internal authentication on `noma-key-value-staging`, resync the Blueprint, and confirm both services' `REDIS_URL` references resolve from that Key Value resource's authenticated private `connectionString`. Confirm external access remains disabled.
6. Confirm all four Render resources are in Frankfurt and the project environment is `staging`, protected, and network-isolated.
7. Deploy the reviewed main commit. Verify the API pre-deploy log shows the committed `pnpm db:migrate:deploy` path succeeded before API start. Worker must show no migration command.
8. Confirm API `/health/live` and `/health/ready`; inspect Worker startup evidence for database and queue readiness without URLs or credentials.
9. Build the Vercel Preview from the same commit, then run `pnpm deploy:smoke` with the three documented safe inputs and, when protection requires it, the secret `VERCEL_AUTOMATION_BYPASS_SECRET` runtime input. Follow with `pnpm deploy:evidence`; never record the bypass value.
10. Attach only the redacted manifests and provider deployment identifiers to the review. Do not activate any provider or business feature.

## Failure handling

Stop on migration failure, readiness failure, release mismatch, unexpected provider mode, wildcard CORS, resource-region mismatch, restart loop, or any secret-bearing output. Do not leave an intentionally failing service active. Follow [staging rollback](staging-rollback.md).
