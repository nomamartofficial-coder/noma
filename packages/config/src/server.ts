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
  readonly authCorrelationSecret?: string;
  readonly databaseUrl?: string;
  readonly redisUrl?: string;
  readonly telemetryAuthorization?: string;
  readonly postmarkServerToken?: string;
}

export interface ServerEmailConfig {
  readonly fromAddress?: string;
  readonly messageStream: string;
}

export interface ServerAuthenticationConfig {
  readonly idleMilliseconds: number;
  readonly absoluteMilliseconds: number;
  readonly touchAfterMilliseconds: number;
  readonly proofRateLimits: Readonly<Record<
    'EMAIL_VERIFICATION_REQUEST' | 'EMAIL_VERIFICATION_CONFIRM' | 'PASSWORD_RECOVERY_REQUEST' | 'PASSWORD_RECOVERY_COMPLETE',
    Readonly<{ windowMilliseconds: number; identity: number; pair: number; network: number }>
  >>;
}

function readAuthRateLimitPolicy(
  source: EnvironmentSource,
  prefix: string,
  defaults: Readonly<{ windowMilliseconds: number; identity: number; pair: number; network: number }>,
  issues: EnvironmentValidationIssue[],
) {
  return Object.freeze({
    windowMilliseconds: readBoundedInteger(source, `${prefix}_WINDOW_MS`, defaults.windowMilliseconds, 60_000, 24 * 60 * 60_000, issues),
    identity: readBoundedInteger(source, `${prefix}_IDENTITY_LIMIT`, defaults.identity, 1, 1_000, issues),
    pair: readBoundedInteger(source, `${prefix}_PAIR_LIMIT`, defaults.pair, 1, 2_000, issues),
    network: readBoundedInteger(source, `${prefix}_NETWORK_LIMIT`, defaults.network, 1, 20_000, issues),
  });
}

export type TelemetryMode = 'disabled' | 'in-memory' | 'otlp';

export interface ServerTelemetryConfig {
  readonly mode: TelemetryMode;
  readonly endpoint?: string;
  readonly traceSampleRatio: number;
  readonly exportIntervalMilliseconds: number;
  readonly exportTimeoutMilliseconds: number;
  readonly shutdownTimeoutMilliseconds: number;
}

function readTraceSampleRatio(
  source: EnvironmentSource,
  mode: TelemetryMode,
  issues: EnvironmentValidationIssue[],
): number {
  const raw = source.NOMA_TRACE_SAMPLE_RATIO?.trim();
  if (mode === 'otlp' && !raw) {
    issues.push({
      key: 'NOMA_TRACE_SAMPLE_RATIO',
      code: 'missing',
      message: 'is required when NOMA_TELEMETRY_MODE=otlp so remote sampling is never implicit',
    });
    return 0;
  }
  if (!raw) return mode === 'in-memory' ? 1 : 0;
  if (mode === 'disabled') {
    issues.push({
      key: 'NOMA_TRACE_SAMPLE_RATIO',
      code: 'invalid',
      message: 'is allowed only when telemetry capture is enabled',
    });
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    issues.push({ key: 'NOMA_TRACE_SAMPLE_RATIO', code: 'invalid', message: 'must be a number from 0 through 1' });
    return mode === 'in-memory' ? 1 : 0;
  }
  return value;
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
  readonly telemetry: ServerTelemetryConfig;
  readonly authentication: ServerAuthenticationConfig;
  readonly email: ServerEmailConfig;
  readonly secrets: ServerSecrets;
}

function readBoundedInteger(
  source: EnvironmentSource,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
  issues: EnvironmentValidationIssue[],
): number {
  const raw = source[key]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    issues.push({ key, code: 'invalid', message: `must be an integer from ${minimum} to ${maximum}` });
    return fallback;
  }
  return value;
}

function readTelemetryConfiguration(
  source: EnvironmentSource,
  applicationEnvironment: ApplicationEnvironment,
  issues: EnvironmentValidationIssue[],
): ServerTelemetryConfig {
  const rawMode = source.NOMA_TELEMETRY_MODE?.trim() || (applicationEnvironment === 'test' ? 'in-memory' : 'disabled');
  if (!['disabled', 'in-memory', 'otlp'].includes(rawMode)) {
    issues.push({ key: 'NOMA_TELEMETRY_MODE', code: 'invalid', message: 'must be disabled, in-memory, or otlp' });
  }
  const mode = ['disabled', 'in-memory', 'otlp'].includes(rawMode) ? rawMode as TelemetryMode : 'disabled';
  const remote = ['preview', 'staging', 'production'].includes(applicationEnvironment);
  const endpoint = source.NOMA_OTLP_ENDPOINT?.trim();
  if (mode === 'otlp' && !endpoint) {
    issues.push({ key: 'NOMA_OTLP_ENDPOINT', code: 'missing', message: 'is required when NOMA_TELEMETRY_MODE=otlp' });
  }
  if (endpoint) {
    try {
      const url = new URL(endpoint);
      if (!['http:', 'https:'].includes(url.protocol) || (remote && url.protocol !== 'https:')) {
        issues.push({ key: 'NOMA_OTLP_ENDPOINT', code: 'insecure', message: 'must use HTTPS outside local development and test' });
      }
      if (url.username || url.password || url.search || url.hash) {
        issues.push({ key: 'NOMA_OTLP_ENDPOINT', code: 'invalid', message: 'must not contain credentials, query parameters, or fragments' });
      }
    } catch {
      issues.push({ key: 'NOMA_OTLP_ENDPOINT', code: 'invalid', message: 'must be a valid HTTP(S) URL' });
    }
  }
  if (mode !== 'otlp' && endpoint) {
    issues.push({ key: 'NOMA_OTLP_ENDPOINT', code: 'invalid', message: 'is allowed only when NOMA_TELEMETRY_MODE=otlp' });
  }
  if (mode === 'in-memory' && remote) {
    issues.push({ key: 'NOMA_TELEMETRY_MODE', code: 'environment-mismatch', message: 'in-memory telemetry is prohibited in remote environments' });
  }
  return Object.freeze({
    mode,
    ...(endpoint && mode === 'otlp' ? { endpoint: endpoint.replace(/\/$/, '') } : {}),
    traceSampleRatio: readTraceSampleRatio(source, mode, issues),
    exportIntervalMilliseconds: readBoundedInteger(source, 'NOMA_TELEMETRY_EXPORT_INTERVAL_MS', 30_000, 5_000, 300_000, issues),
    exportTimeoutMilliseconds: readBoundedInteger(source, 'NOMA_TELEMETRY_EXPORT_TIMEOUT_MS', 3_000, 500, 10_000, issues),
    shutdownTimeoutMilliseconds: readBoundedInteger(source, 'NOMA_TELEMETRY_SHUTDOWN_TIMEOUT_MS', 5_000, 500, 15_000, issues),
  });
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
  const telemetry = readTelemetryConfiguration(source, applicationEnvironment, issues);
  const authentication = Object.freeze({
    idleMilliseconds: readBoundedInteger(source, 'NOMA_AUTH_IDLE_MS', 7 * 24 * 60 * 60_000, 60_000, 30 * 24 * 60 * 60_000, issues),
    absoluteMilliseconds: readBoundedInteger(source, 'NOMA_AUTH_ABSOLUTE_MS', 30 * 24 * 60 * 60_000, 60_000, 90 * 24 * 60 * 60_000, issues),
    touchAfterMilliseconds: readBoundedInteger(source, 'NOMA_AUTH_TOUCH_AFTER_MS', 15 * 60_000, 60_000, 24 * 60 * 60_000, issues),
    proofRateLimits: Object.freeze({
      EMAIL_VERIFICATION_REQUEST: readAuthRateLimitPolicy(source, 'NOMA_EMAIL_VERIFICATION_REQUEST', { windowMilliseconds: 60 * 60_000, identity: 5, pair: 8, network: 100 }, issues),
      EMAIL_VERIFICATION_CONFIRM: readAuthRateLimitPolicy(source, 'NOMA_EMAIL_VERIFICATION_CONFIRM', { windowMilliseconds: 15 * 60_000, identity: 10, pair: 20, network: 200 }, issues),
      PASSWORD_RECOVERY_REQUEST: readAuthRateLimitPolicy(source, 'NOMA_PASSWORD_RECOVERY_REQUEST', { windowMilliseconds: 60 * 60_000, identity: 5, pair: 8, network: 100 }, issues),
      PASSWORD_RECOVERY_COMPLETE: readAuthRateLimitPolicy(source, 'NOMA_PASSWORD_RECOVERY_COMPLETE', { windowMilliseconds: 15 * 60_000, identity: 8, pair: 12, network: 100 }, issues),
    }),
  });
  if (authentication.idleMilliseconds > authentication.absoluteMilliseconds) {
    issues.push({ key: 'NOMA_AUTH_IDLE_MS', code: 'invalid', message: 'must not exceed NOMA_AUTH_ABSOLUTE_MS' });
  }

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
  for (const [key, value] of [['PUBLIC_WEB_ORIGIN', publicWebOrigin], ['API_PUBLIC_URL', apiPublicUrl]] as const) {
    if (!value) continue;
    const url = new URL(value);
    if (url.username || url.password || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
      issues.push({ key, code: 'invalid', message: 'must be an origin without credentials, path, query, or fragment' });
    }
  }

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
  const authConfigured = runtime === 'api' && Boolean(databaseUrl) && Boolean(redisUrl);
  const sessionSecret = readSecret(source, 'SESSION_SECRET', issues, {
    required: production || (applicationEnvironment === 'staging' && runtime === 'api'),
    minimumLength: 32,
  });
  const authCorrelationSecret = readSecret(source, 'AUTH_CORRELATION_SECRET', issues, {
    required: authConfigured,
    minimumLength: 32,
  });
  const telemetryAuthorization = readSecret(source, 'NOMA_OTLP_AUTHORIZATION', issues, {
    required: telemetry.mode === 'otlp' && ['staging', 'production'].includes(applicationEnvironment),
    minimumLength: 16,
  });
  const postmarkServerToken = readSecret(source, 'POSTMARK_SERVER_TOKEN', issues, {
    required: runtime === 'worker' && providerAdapterMode === 'real',
    minimumLength: 20,
  });
  const postmarkFromAddress = source.POSTMARK_FROM_ADDRESS?.trim();
  if (runtime === 'worker' && providerAdapterMode === 'real' && !postmarkFromAddress) {
    issues.push({ key: 'POSTMARK_FROM_ADDRESS', code: 'missing', message: 'is required for real transactional email delivery' });
  }
  if (postmarkFromAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(postmarkFromAddress)) {
    issues.push({ key: 'POSTMARK_FROM_ADDRESS', code: 'invalid', message: 'must be a valid sender address' });
  }
  const postmarkMessageStream = source.POSTMARK_MESSAGE_STREAM?.trim() || 'outbound';
  if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(postmarkMessageStream)) {
    issues.push({ key: 'POSTMARK_MESSAGE_STREAM', code: 'invalid', message: 'must be a safe Postmark message stream' });
  }
  if (telemetry.mode !== 'otlp' && telemetryAuthorization) {
    issues.push({ key: 'NOMA_OTLP_AUTHORIZATION', code: 'invalid', message: 'is allowed only when NOMA_TELEMETRY_MODE=otlp' });
  }

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
    telemetry,
    authentication,
    email: Object.freeze({ ...(postmarkFromAddress ? { fromAddress: postmarkFromAddress } : {}), messageStream: postmarkMessageStream }),
    address,
    publicWebOrigin,
    apiPublicUrl,
    ...(releaseSha ? { releaseSha } : {}),
    secrets: createSecretContainer({
      ...(sessionSecret ? { sessionSecret } : {}),
      ...(authCorrelationSecret ? { authCorrelationSecret } : {}),
      ...(databaseUrl ? { databaseUrl } : {}),
      ...(redisUrl ? { redisUrl } : {}),
      ...(telemetryAuthorization ? { telemetryAuthorization } : {}),
      ...(postmarkServerToken ? { postmarkServerToken } : {}),
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
    telemetry: Object.freeze({
      mode: config.telemetry.mode,
      traceSampleRatio: config.telemetry.traceSampleRatio,
      exportIntervalMilliseconds: config.telemetry.exportIntervalMilliseconds,
      exportTimeoutMilliseconds: config.telemetry.exportTimeoutMilliseconds,
      shutdownTimeoutMilliseconds: config.telemetry.shutdownTimeoutMilliseconds,
      endpointConfigured: Boolean(config.telemetry.endpoint),
    }),
    authentication: config.authentication,
    email: Object.freeze({ fromAddressConfigured: Boolean(config.email.fromAddress), messageStream: config.email.messageStream }),
    address: config.address,
    publicWebOrigin: config.publicWebOrigin,
    apiPublicUrl: config.apiPublicUrl,
    releaseSha: config.releaseSha ?? null,
    configuredSecrets: Object.freeze({
      sessionSecret: Boolean(config.secrets.sessionSecret),
      authCorrelationSecret: Boolean(config.secrets.authCorrelationSecret),
      databaseUrl: Boolean(config.secrets.databaseUrl),
      redisUrl: Boolean(config.secrets.redisUrl),
      telemetryAuthorization: Boolean(config.secrets.telemetryAuthorization),
      postmarkServerToken: Boolean(config.secrets.postmarkServerToken),
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
