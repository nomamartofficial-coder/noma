import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadEnvFile } from 'node:process';
import {
  describeServerEnvironment,
  loadServerEnvironment,
  toSafeStartupError,
} from '@noma/config/server';
import { WorkerModule } from './app.module.js';
import { startHealthServer } from './health-server.js';
import { QueueRuntimeService } from './queue-runtime.service.js';

const REMOTE_ENVIRONMENTS = new Set(['preview', 'staging', 'production']);

function loadOptionalLocalEnvironment(): void {
  if (process.env.NOMA_ENV && REMOTE_ENVIRONMENTS.has(process.env.NOMA_ENV)) return;

  try {
    loadEnvFile(new URL('../.env', import.meta.url));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  if (process.env.NOMA_ENV && REMOTE_ENVIRONMENTS.has(process.env.NOMA_ENV)) {
    throw new Error('Remote environments must use platform-managed configuration, not a local .env file');
  }
}

async function bootstrap(): Promise<void> {
  loadOptionalLocalEnvironment();
  const config = loadServerEnvironment('worker', process.env);
  let shuttingDown = false;
  const app = await NestFactory.createApplicationContext(WorkerModule.register(config), { bufferLogs: true });
  app.enableShutdownHooks();
  const queueRuntime = app.get(QueueRuntimeService);

  const healthServer = startHealthServer(
    config.address.host,
    config.address.port,
    () => shuttingDown
      ? { ready: false, dependencies: queueRuntime.dependencies() }
      : queueRuntime.health(),
  );
  console.log(JSON.stringify({
    event: 'runtime.started',
    ...describeServerEnvironment(config),
  }));

  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    await new Promise<void>((resolve) => healthServer.close(() => resolve()));
    await app.close();
  };

  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

void bootstrap().catch((error: unknown) => {
  const diagnostic = `${JSON.stringify(toSafeStartupError(error))}\n`;
  process.stderr.write(diagnostic, () => process.exit(1));
});
