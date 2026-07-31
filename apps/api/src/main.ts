import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { resolveRuntimeAddress } from '@noma/config/server';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();

  const { host, port } = resolveRuntimeAddress('api', process.env);
  await app.listen(port, host);
  console.log(JSON.stringify({ event: 'runtime.started', runtime: 'api', host, port }));
}

void bootstrap();
