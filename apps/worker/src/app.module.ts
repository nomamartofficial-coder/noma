import { Module, type DynamicModule } from '@nestjs/common';
import type { ServerRuntimeConfig } from '@noma/config/server';
import type { ServerObservability } from '@noma/observability/server';
import { QueueRuntimeService, WORKER_OBSERVABILITY, WORKER_RUNTIME_CONFIG } from './queue-runtime.service.js';

@Module({})
export class WorkerModule {
  static register(config: ServerRuntimeConfig, observability: ServerObservability): DynamicModule {
    return {
      module: WorkerModule,
      providers: [
        { provide: WORKER_RUNTIME_CONFIG, useValue: config },
        { provide: WORKER_OBSERVABILITY, useValue: observability },
        QueueRuntimeService,
      ],
      exports: [QueueRuntimeService],
    };
  }
}
