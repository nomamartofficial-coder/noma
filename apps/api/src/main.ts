import 'reflect-metadata';
import { loadEnvFile } from 'node:process';
import {
  describeServerEnvironment,
  loadServerEnvironment,
  toSafeStartupError,
} from '@noma/config/server';

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
  const [{ NestFactory }, { AppModule }] = await Promise.all([
    import('@nestjs/core'),
    import('./app.module.js'),
  ]);
  const app = await NestFactory.create(AppModule.forRoot(config), { bufferLogs: true });
  app.enableShutdownHooks();
  app.enableCors({
    origin: config.publicWebOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Correlation-Id'],
  });

  await app.listen(config.address.port, config.address.host);
  console.log(JSON.stringify({
    event: 'runtime.started',
    ...describeServerEnvironment(config),
  }));
}

void bootstrap().catch((error: unknown) => {
  const diagnostic = `${JSON.stringify(toSafeStartupError(error))}\n`;
  process.stderr.write(diagnostic, () => process.exit(1));
});
