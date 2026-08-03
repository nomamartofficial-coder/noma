import { EnvironmentValidationError, toSafeStartupError } from './errors.js';
import type {
  ApplicationEnvironment,
  EnvironmentSource,
  EnvironmentValidationIssue,
  ProviderAdapterMode,
  RuntimeAddress,
  RuntimeName,
} from './model.js';
import { PROVIDER_ADAPTER_MODES } from './model.js';
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
  readonly providerAdapterMode: ProviderAdapterMode;
  readonly secrets: ServerSecrets;
}

function readProviderAdapterMode(
  source: EnvironmentSource,
  applicationEnvironment: ApplicationEnvironment,
  issues: EnvironmentValidationIssue[],
): ProviderAdapterMode {
  const raw = source.NOMA_PROVIDER_MODE?.trim() || 'disabled';
  if (!PROVIDER_ADAPTER_MODES.includes(raw as ProviderAdapterMode)) {
    issues.push({ key: 'NOMA_PROVIDER_MODE', code: 'invalid', message: 'must be disabled, simulator, or real' });
    return 'disabled';
  }
  const mode = raw as ProviderAdapterMode;
  if (applicationEnvironment === 'production' && mode === 'simulator') {
    issues.push({ key: 'NOMA_PROVIDER_MODE', code: 'environment-mismatch', message: 'simulator mode is prohibited in production' });
  }
  if (mode === 'real') {
    issues.push({ key: 'NOMA_PROVIDER_MODE', code: 'invalid', message: 'real provider adapters are not implemented by DEV-007' });
  }
  return mode;
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
  const providerAdapterMode = readProviderAdapterMode(source, applicationEnvironment, issues);

  const remote = ['preview', 'staging', 'production'].includes(applicationEnvironment);
  const production = applicationEnvironment === 'production';
  const deployedBackend = ['staging', 'production'].includes(applicationEnvironment);
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
    required: production || (applicationEnvironment === 'staging' && runtime === 'api'),
    minimumLength: 32,
  });
  const databaseUrl = readUrl(source, 'DATABASE_URL', issues, {
    required: deployedBackend,
    protocols: ['postgres:', 'postgresql:'],
    requireTls: false,
  });
  const redisUrl = readUrl(source, 'REDIS_URL', issues, {
    required: deployedBackend,
    protocols: ['redis:', 'rediss:'],
    requireTls: production,
  });

  if (
    (runtime === 'worker' && Boolean(databaseUrl) !== Boolean(redisUrl))
    || (runtime === 'api' && Boolean(databaseUrl) !== Boolean(redisUrl))
  ) {
    issues.push({
      key: databaseUrl ? 'REDIS_URL' : 'DATABASE_URL',
      code: 'missing',
      message: `must be configured together with the ${runtime} database and queue dependency`,
    });
  }

  if (deployedBackend && databaseUrl) {
    const database = new URL(databaseUrl);
    const sslMode = database.searchParams.get('sslmode');
    const ssl = database.searchParams.get('ssl');
    if (!['require', 'verify-ca', 'verify-full'].includes(sslMode ?? '') && ssl !== 'true') {
      issues.push({
        key: 'DATABASE_URL',
        code: 'insecure',
        message: 'must require encrypted PostgreSQL transport in staging and production',
      });
    }
  }

  const releaseSha = source.NOMA_RELEASE_SHA?.trim();
  const releaseShaPattern = deployedBackend ? /^[a-f0-9]{40}$/i : /^[a-f0-9]{7,40}$/i;
  if (releaseSha && !releaseShaPattern.test(releaseSha)) {
    issues.push({
      key: 'NOMA_RELEASE_SHA',
      code: 'invalid',
      message: deployedBackend
        ? 'must be a full 40 character Git commit SHA in staging and production'
        : 'must be a 7 to 40 character Git commit SHA',
    });
  }

  if (deployedBackend) {
    readRequiredString(source, 'NOMA_RELEASE_SHA', issues, 40);
  }

  if (issues.length > 0 || !publicWebOrigin || !apiPublicUrl) {
    throw new EnvironmentValidationError(issues);
  }

  const config: ServerRuntimeConfig = {
    applicationEnvironment,
    credentialEnvironment,
    runtime,
    providerAdapterMode,
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
    providerAdapterMode: config.providerAdapterMode,
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
  ProviderAdapterMode,
} from './model.js';
