import { Injectable } from '@nestjs/common';
import { createHealthResponse, type RuntimeHealthResponse } from '@noma/contracts';
import { RuntimeDependenciesService } from '../runtime-dependencies.service.js';

@Injectable()
export class HealthService {
  constructor(private readonly runtimeDependencies: RuntimeDependenciesService) {}

  liveness(): RuntimeHealthResponse {
    const releaseSha = this.runtimeDependencies.config.releaseSha;

    return createHealthResponse({
      runtime: 'api',
      check: 'liveness',
      ready: true,
      environment: this.runtimeDependencies.config.applicationEnvironment,
      ...(releaseSha === undefined ? {} : { releaseSha }),
    });
  }

  readiness(): RuntimeHealthResponse {
    const health = this.runtimeDependencies.snapshot();
    const releaseSha = this.runtimeDependencies.config.releaseSha;

    return createHealthResponse({
      runtime: 'api',
      check: 'readiness',
      ready: health.ready,
      environment: this.runtimeDependencies.config.applicationEnvironment,
      ...(releaseSha === undefined ? {} : { releaseSha }),
      dependencies: health.dependencies,
    });
  }
}
