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
  const config = loadServerEnvironment('api', process.env);
  const [{ NestFactory }, { AppModule }, { startServerObservability }] = await Promise.all([
    import('@nestjs/core'),
    import('./app.module.js'),
    import('@noma/observability/server'),
  ]);
  const observability = await startServerObservability({
    serviceName: 'noma-api',
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
  const app = await NestFactory.create(AppModule.forRoot(config, observability), { bufferLogs: true });
  app.useLogger(observability.nestLogger);
  app.use(observability.httpMiddleware);
  app.enableCors({
    origin: config.publicWebOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Correlation-Id', 'X-Request-Id', 'Traceparent', 'Tracestate'],
    exposedHeaders: ['X-Correlation-Id', 'X-Request-Id'],
  });

  await app.listen(config.address.port, config.address.host);
  observability.logger.info('runtime.started', 'succeeded', describeServerEnvironment(config));
  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    observability.logger.info('runtime.shutdown', 'started', { signal });
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
