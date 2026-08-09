import { Module, type DynamicModule } from '@nestjs/common';
import type { ServerRuntimeConfig } from '@noma/config/server';
import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';
import { API_RUNTIME_CONFIG, RuntimeDependenciesService } from './runtime-dependencies.service.js';

@Module({
  controllers: [HealthController],
  providers: [],
})
export class AppModule {
  static forRoot(config: ServerRuntimeConfig): DynamicModule {
    return {
      module: AppModule,
      providers: [
        { provide: API_RUNTIME_CONFIG, useValue: config },
        RuntimeDependenciesService,
        HealthService,
      ],
    };
  }
}
