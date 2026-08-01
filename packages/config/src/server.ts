import { EnvironmentValidationError, toSafeStartupError } from './errors.js';
import type {
  ApplicationEnvironment,
  EnvironmentSource,
  EnvironmentValidationIssue,
  RuntimeAddress,
  RuntimeName,
} from './model.js';
import {
  readApplicationEnvironment,
  readRequiredString,
  readSecret,
  readUrl,
} from './parsers.js';
import { redactEnvironment, redactText } from './redaction.js';
import { resolveRuntimeAddress } from './runtime.js';

export interface ServerSecrets {
  readonly sessionSecret?: string;
  readonly databaseUrl?: string;
  readonly redisUrl?: string;
}

export interface ServerRuntimeConfig {
  readonly applicationEnvironment: ApplicationEnvironment;
  readonly credentialEnvironment: ApplicationEnvironment;
  readonly runtime: RuntimeName;
  readonly address: RuntimeAddress;
  readonly publicWebOrigin: string;
  readonly apiPublicUrl: string;
  readonly releaseSha?: string;
  readonly secrets: ServerSecrets;
}

function createSecretContainer(values: ServerSecrets): ServerSecrets {
  const container = {} as Record<string, string | undefined>;

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    Object.defineProperty(container, key, {
      configurable: false,
      enumerable: false,
      value,
      writable: false,
    });
  }

  return Object.freeze(container) as ServerSecrets;
}

function detectCredentialEnvironment(
  source: EnvironmentSource,
  applicationEnvironment: ApplicationEnvironment,
  issues: EnvironmentValidationIssue[],
): ApplicationEnvironment {
  const remote = ['preview', 'staging', 'production'].includes(applicationEnvironment);
  const fallback = remote ? undefined : applicationEnvironment;
  const raw = source.NOMA_CREDENTIAL_ENVIRONMENT?.trim();

  if (!raw && fallback === undefined) {
    issues.push({
      key: 'NOMA_CREDENTIAL_ENVIRONMENT',
      code: 'missing',
      message: 'is required for preview, staging, and production',
    });
    return applicationEnvironment;
  }

  return readApplicationEnvironment(
    source,
    'NOMA_CREDENTIAL_ENVIRONMENT',
    fallback ?? applicationEnvironment,
    issues,
  );
}

function validateEnvironmentIsolation(
  source: EnvironmentSource,
  applicationEnvironment: ApplicationEnvironment,
  credentialEnvironment: ApplicationEnvironment,
  issues: EnvironmentValidationIssue[],
): void {
  if (applicationEnvironment !== credentialEnvironment) {
    issues.push({
      key: 'NOMA_CREDENTIAL_ENVIRONMENT',
      code: 'environment-mismatch',
      message: 'must match NOMA_ENV so credentials cannot cross environment boundaries',
    });
  }

  const paystackSecret = source.PAYSTACK_SECRET_KEY?.trim();
  if (applicationEnvironment !== 'production' && paystackSecret?.startsWith('sk_live_')) {
    issues.push({
      key: 'PAYSTACK_SECRET_KEY',
      code: 'environment-mismatch',
      message: 'live Paystack credentials are prohibited outside production',
    });
  }

  if (applicationEnvironment === 'production' && paystackSecret?.startsWith('sk_test_')) {
    issues.push({
      key: 'PAYSTACK_SECRET_KEY',
      code: 'environment-mismatch',
      message: 'test Paystack credentials are prohibited in production',
    });
  }
}

export function loadServerEnvironment(
  runtime: Exclude<RuntimeName, 'web'>,
  source: EnvironmentSource,
): ServerRuntimeConfig {
  const issues: EnvironmentValidationIssue[] = [];
  const applicationEnvironment = readApplicationEnvironment(
    source,
    'NOMA_ENV',
    'development',
    issues,
  );
  const credentialEnvironment = detectCredentialEnvironment(source, applicationEnvironment, issues);
  validateEnvironmentIsolation(source, applicationEnvironment, credentialEnvironment, issues);

  const remote = ['preview', 'staging', 'production'].includes(applicationEnvironment);
  const production = applicationEnvironment === 'production';
  const address = resolveRuntimeAddress(runtime, source, issues);
  const publicWebOrigin = readUrl(source, 'PUBLIC_WEB_ORIGIN', issues, {
    required: remote,
    ...(remote ? {} : { fallback: 'http://127.0.0.1:3000' }),
    protocols: ['http:', 'https:'],
    requireTls: remote,
  });
  const apiPublicUrl = readUrl(source, 'API_PUBLIC_URL', issues, {
    required: remote,
    ...(remote ? {} : { fallback: 'http://127.0.0.1:3001' }),
    protocols: ['http:', 'https:'],
    requireTls: remote,
  });

  const sessionSecret = readSecret(source, 'SESSION_SECRET', issues, {
    required: production,
    minimumLength: 32,
  });
  const databaseUrl = readUrl(source, 'DATABASE_URL', issues, {
    required: production,
    protocols: ['postgres:', 'postgresql:'],
    requireTls: false,
  });
  const redisUrl = readUrl(source, 'REDIS_URL', issues, {
    required: production,
    protocols: ['redis:', 'rediss:'],
    requireTls: production,
  });

  if (runtime === 'worker' && Boolean(databaseUrl) !== Boolean(redisUrl)) {
    issues.push({
      key: databaseUrl ? 'REDIS_URL' : 'DATABASE_URL',
      code: 'missing',
      message: 'must be configured together with the Worker database and queue dependency',
    });
  }

  if (production && databaseUrl) {
    const database = new URL(databaseUrl);
    const sslMode = database.searchParams.get('sslmode');
    const ssl = database.searchParams.get('ssl');
    if (!['require', 'verify-ca', 'verify-full'].includes(sslMode ?? '') && ssl !== 'true') {
      issues.push({
        key: 'DATABASE_URL',
        code: 'insecure',
        message: 'must require encrypted PostgreSQL transport in production',
      });
    }
  }

  const releaseSha = source.NOMA_RELEASE_SHA?.trim();
  if (releaseSha && !/^[a-f0-9]{7,40}$/i.test(releaseSha)) {
    issues.push({ key: 'NOMA_RELEASE_SHA', code: 'invalid', message: 'must be a 7 to 40 character Git commit SHA' });
  }

  if (production) {
    readRequiredString(source, 'NOMA_RELEASE_SHA', issues, 7);
  }

  if (issues.length > 0 || !publicWebOrigin || !apiPublicUrl) {
    throw new EnvironmentValidationError(issues);
  }

  const config: ServerRuntimeConfig = {
    applicationEnvironment,
    credentialEnvironment,
    runtime,
    address,
    publicWebOrigin,
    apiPublicUrl,
    ...(releaseSha ? { releaseSha } : {}),
    secrets: createSecretContainer({
      ...(sessionSecret ? { sessionSecret } : {}),
      ...(databaseUrl ? { databaseUrl } : {}),
      ...(redisUrl ? { redisUrl } : {}),
    }),
  };

  Object.defineProperty(config, 'toJSON', {
    enumerable: false,
    value: () => describeServerEnvironment(config),
  });

  return Object.freeze(config);
}

export function describeServerEnvironment(config: ServerRuntimeConfig): Readonly<Record<string, unknown>> {
  return Object.freeze({
    applicationEnvironment: config.applicationEnvironment,
    credentialEnvironment: config.credentialEnvironment,
    runtime: config.runtime,
    address: config.address,
    publicWebOrigin: config.publicWebOrigin,
    apiPublicUrl: config.apiPublicUrl,
    releaseSha: config.releaseSha ?? null,
    configuredSecrets: Object.freeze({
      sessionSecret: Boolean(config.secrets.sessionSecret),
      databaseUrl: Boolean(config.secrets.databaseUrl),
      redisUrl: Boolean(config.secrets.redisUrl),
    }),
  });
}

export const serverConfigBoundary = 'server-only' as const;
export {
  EnvironmentValidationError,
  redactEnvironment,
  redactText,
  resolveRuntimeAddress,
  toSafeStartupError,
};
export type {
  ApplicationEnvironment,
  EnvironmentSource,
  RuntimeAddress,
  RuntimeName,
} from './model.js';
