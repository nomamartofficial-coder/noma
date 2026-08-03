import { createHealthResponse } from '@noma/contracts';

export function GET() {
  const environment = process.env.NEXT_PUBLIC_NOMA_ENV ?? process.env.VERCEL_ENV;
  const releaseSha = process.env.VERCEL_GIT_COMMIT_SHA;

  return Response.json(
    createHealthResponse({
      runtime: 'web',
      check: 'readiness',
      ready: true,
      ...(environment === undefined ? {} : { environment }),
      ...(releaseSha === undefined ? {} : { releaseSha }),
      dependencies: { api: 'not-configured' },
    }),
  );
}
