import { Injectable } from '@nestjs/common';
import { createHealthResponse, type RuntimeHealthResponse } from '@noma/contracts';

@Injectable()
export class HealthService {
  liveness(): RuntimeHealthResponse {
    return createHealthResponse({ runtime: 'api', check: 'liveness', ready: true });
  }

  readiness(): RuntimeHealthResponse {
    return createHealthResponse({
      runtime: 'api',
      check: 'readiness',
      ready: true,
      dependencies: {
        database: 'not-configured',
        queue: 'not-configured',
      },
    });
  }
}
