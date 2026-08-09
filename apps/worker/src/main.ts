import 'reflect-metadata';
import { loadEnvFile } from 'node:process';
import {
  describeServerEnvironment,
  loadServerEnvironment,
  toSafeStartupError,
} from '@noma/config/server';
import type { ServerObservability } from '@noma/observability/server';

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
  const [
    { NestFactory },
    { WorkerModule },
    { startHealthServer },
    { QueueRuntimeService },
    { startServerObservability },
  ] = await Promise.all([
    import('@nestjs/core'),
    import('./app.module.js'),
    import('./health-server.js'),
    import('./queue-runtime.service.js'),
    import('@noma/observability/server'),
  ]);
  const observability = await startServerObservability({
    serviceName: 'noma-worker',
    environment: config.applicationEnvironment,
    ...(config.releaseSha ? { releaseSha: config.releaseSha } : {}),
    mode: config.telemetry.mode,
    ...(config.telemetry.endpoint ? { endpoint: config.telemetry.endpoint } : {}),
    ...(config.secrets.telemetryAuthorization ? { authorization: config.secrets.telemetryAuthorization } : {}),
    traceSampleRatio: config.telemetry.traceSampleRatio,
    exportIntervalMilliseconds: config.telemetry.exportIntervalMilliseconds,
    exportTimeoutMilliseconds: config.telemetry.exportTimeoutMilliseconds,
    shutdownTimeoutMilliseconds: config.telemetry.shutdownTimeoutMilliseconds,
  });
  activeObservability = observability;
  let shuttingDown = false;
  const app = await NestFactory.createApplicationContext(WorkerModule.register(config, observability), { bufferLogs: true });
  app.useLogger(observability.nestLogger);
  const queueRuntime = app.get(QueueRuntimeService);

  const healthServer = startHealthServer(
    config.address.host,
    config.address.port,
    {
      environment: config.applicationEnvironment,
      ...(config.releaseSha === undefined ? {} : { releaseSha: config.releaseSha }),
    },
    () => shuttingDown
      ? { ready: false, dependencies: queueRuntime.dependencies() }
      : queueRuntime.health(),
    observability,
  );
  observability.logger.info('runtime.started', 'succeeded', describeServerEnvironment(config));

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    observability.logger.info('runtime.shutdown', 'started', { signal });
    await new Promise<void>((resolve) => healthServer.close(() => resolve()));
    await app.close();
    await observability.shutdown();
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

let activeObservability: ServerObservability | undefined;
void bootstrap().catch((error: unknown) => {
  activeObservability?.logger.error('runtime.startup', 'failed', error);
  const diagnostic = `${JSON.stringify(toSafeStartupError(error))}\n`;
  process.stderr.write(diagnostic, () => {
    void activeObservability?.shutdown().finally(() => process.exit(1));
    if (!activeObservability) process.exit(1);
  });
});
