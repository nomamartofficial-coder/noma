import { Controller, Get } from '@nestjs/common';
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
    return this.healthService.readiness();
  }
}
