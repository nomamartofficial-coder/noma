import { createServer, type Server } from 'node:http';
import { createHealthResponse } from '@noma/contracts';

export function startHealthServer(host: string, port: number, isReady: () => boolean): Server {
  const server = createServer((request, response) => {
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

    const ready = check === 'liveness' ? true : isReady();
    const body = createHealthResponse({
      runtime: 'worker',
      check,
      ready,
      dependencies: { queue: 'not-configured', database: 'not-configured' },
    });

    response.writeHead(ready ? 200 : 503, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  });

  server.listen(port, host);
  return server;
}
