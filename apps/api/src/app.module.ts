import { Module, type DynamicModule } from '@nestjs/common';
import type { ServerRuntimeConfig } from '@noma/config/server';
import type { ServerObservability } from '@noma/observability/server';
import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthorizationModule } from './authorization/authorization.module.js';
import { API_OBSERVABILITY, API_RUNTIME_CONFIG, RuntimeDependenciesService } from './runtime-dependencies.service.js';

@Module({
  controllers: [HealthController],
  providers: [],
})
export class AppModule {
  static forRoot(config: ServerRuntimeConfig, observability: ServerObservability): DynamicModule {
    return {
      module: AppModule,
      imports: [AuthModule.forRoot(config, observability), AuthorizationModule],
      providers: [
        { provide: API_RUNTIME_CONFIG, useValue: config },
        { provide: API_OBSERVABILITY, useValue: observability },
        RuntimeDependenciesService,
        HealthService,
      ],
    };
  }
}
