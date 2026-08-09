import { createServer, type Server } from 'node:http';
import {
  createHealthResponse,
  type DependencyHealth,
} from '@noma/contracts';
import type { ServerObservability } from '@noma/observability/server';

export interface WorkerHealthSnapshot {
  readonly ready: boolean;
  readonly dependencies: Readonly<Record<string, DependencyHealth>>;
}

export function startHealthServer(
  host: string,
  port: number,
  deployment: { readonly environment: string; readonly releaseSha?: string },
  readHealth: () => WorkerHealthSnapshot,
  observability?: ServerObservability,
): Server {
  const server = createServer((request, response) => {
    const handle = (): void => {
    const check = request.url === '/health/ready'
      ? 'readiness'
      : request.url === '/health/live'
        ? 'liveness'
        : null;

    if (check === null) {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    const health = readHealth();
    const ready = check === 'liveness' ? true : health.ready;
    const body = createHealthResponse({
      runtime: 'worker',
      check,
      ready,
      environment: deployment.environment,
      ...(deployment.releaseSha === undefined ? {} : { releaseSha: deployment.releaseSha }),
      dependencies: health.dependencies,
    });

    response.writeHead(ready ? 200 : 503, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
    };
    if (observability) {
      observability.httpMiddleware(request, response, handle);
    } else {
      handle();
    }
  });

  server.listen(port, host);
  return server;
}
