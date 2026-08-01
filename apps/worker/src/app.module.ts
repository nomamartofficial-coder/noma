import { Module, type DynamicModule } from '@nestjs/common';
import type { ServerRuntimeConfig } from '@noma/config/server';
import { QueueRuntimeService, WORKER_RUNTIME_CONFIG } from './queue-runtime.service.js';

@Module({})
export class WorkerModule {
  static register(config: ServerRuntimeConfig): DynamicModule {
    return {
      module: WorkerModule,
      providers: [
        { provide: WORKER_RUNTIME_CONFIG, useValue: config },
        QueueRuntimeService,
      ],
      exports: [QueueRuntimeService],
    };
  }
}
