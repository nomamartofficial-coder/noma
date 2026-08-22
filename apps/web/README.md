# @noma/web

Next.js App Router scaffold for Noma's public and role-oriented Web surfaces. DEV-002 includes only the root shell and `/health/live` plus `/health/ready`; product routes and business behaviour remain unimplemented.

DEV-009 deploys this runtime only as a protected Vercel Preview. `main` cannot trigger a Vercel Production deployment. Preview configuration contains only `NEXT_PUBLIC_NOMA_ENV` and `NEXT_PUBLIC_API_BASE_URL`; server secrets and provider credentials are prohibited.

UI-006 keeps Storybook, synthetic fixtures, browser tests, and visual evidence outside `src`, so they do not enter the Next.js production compilation. Use the root `storybook` and `ui:storybook:*` commands for private local documentation and real-Chromium accessibility checks. Storybook is not a production route or deployable service. See [`STORYBOOK.md`](../../STORYBOOK.md) and [`VISUAL_TESTING.md`](../../VISUAL_TESTING.md).
