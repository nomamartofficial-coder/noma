# @noma/web

Next.js App Router scaffold for Noma's public and role-oriented Web surfaces. DEV-002 includes only the root shell and `/health/live` plus `/health/ready`; product routes and business behaviour remain unimplemented.

DEV-009 deploys this runtime only as a protected Vercel Preview. `main` cannot trigger a Vercel Production deployment. Preview configuration contains only `NEXT_PUBLIC_NOMA_ENV` and `NEXT_PUBLIC_API_BASE_URL`; server secrets and provider credentials are prohibited.
