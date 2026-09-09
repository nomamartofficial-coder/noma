import { Module, type DynamicModule } from '@nestjs/common';
import type { ServerRuntimeConfig } from '@noma/config/server';
import type { ServerObservability } from '@noma/observability/server';

import { API_OBSERVABILITY, API_RUNTIME_CONFIG } from '../runtime-dependencies.service.js';
import { AuthController } from './auth.controller.js';
import { AuthRuntimeService } from './auth-runtime.service.js';

@Module({})
export class AuthModule {
  static forRoot(config: ServerRuntimeConfig, observability: ServerObservability): DynamicModule {
    return {
      module: AuthModule,
      controllers: [AuthController],
      providers: [
        { provide: API_RUNTIME_CONFIG, useValue: config },
        { provide: API_OBSERVABILITY, useValue: observability },
        AuthRuntimeService,
      ],
    };
  }
}
