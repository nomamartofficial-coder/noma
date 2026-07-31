import { createHealthResponse } from '@noma/contracts';

export function GET() {
  return Response.json(createHealthResponse({ runtime: 'web', check: 'liveness', ready: true }));
}
