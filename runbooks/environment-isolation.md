# Preview/staging environment-isolation runbook

## Required attestations

- Vercel environment is Preview; `main` cannot deploy to Vercel Production.
- Render project/environment is exactly `noma/staging`; all resources are Frankfurt.
- `NOMA_ENV` and `NOMA_CREDENTIAL_ENVIRONMENT` both equal `staging`.
- API and Worker report the exact reviewed `NOMA_RELEASE_SHA`.
- Web exposes only `NEXT_PUBLIC_NOMA_ENV` and `NEXT_PUBLIC_API_BASE_URL`.
- API CORS equals one protected preview origin and never a wildcard or all Vercel hosts.
- PostgreSQL and Key Value are staging-only, externally unreachable, and contain no production data.
- PostgreSQL transport is encrypted; Key Value internal authentication is enabled.
- API owns migrations; Worker does not.
- `NOMA_PROVIDER_MODE=disabled`; no live or simulator provider traffic is active.
- Session, database, and queue credentials exist only in Render protected configuration and never in Vercel, Git, logs, evidence, tickets, or chat.

## Mismatch response

Fail the deployment and rotate any credential that may have crossed an environment. Preserve only redacted identifiers, disable affected services, check Git and build artefacts for exposure, and open a Security-owned incident/change record. Never “fix” a mismatch by changing the credential marker alone; the backing account and datastore must be proven staging-scoped.
