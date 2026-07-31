import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { resolveRuntimeAddress } from '@noma/config/server';
import { WorkerModule } from './app.module.js';
import { startHealthServer } from './health-server.js';

async function bootstrap(): Promise<void> {
  let ready = false;
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.enableShutdownHooks();

  const { host, port } = resolveRuntimeAddress('worker', process.env);
  const healthServer = startHealthServer(host, port, () => ready);
  ready = true;
  console.log(JSON.stringify({ event: 'runtime.started', runtime: 'worker', host, port }));

  const shutdown = async (): Promise<void> => {
    ready = false;
    await new Promise<void>((resolve) => healthServer.close(() => resolve()));
    await app.close();
  };

  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

void bootstrap();
