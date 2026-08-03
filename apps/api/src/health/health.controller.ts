import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { RuntimeHealthResponse } from '@noma/contracts';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  liveness(): RuntimeHealthResponse {
    return this.healthService.liveness();
  }

  @Get('ready')
  readiness(): RuntimeHealthResponse {
    const health = this.healthService.readiness();
    if (health.status !== 'ok') throw new ServiceUnavailableException(health);
    return health;
  }
}
