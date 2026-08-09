import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  EnvironmentValidationError,
  loadPublicEnvironment,
} from '../dist/public.js';
import {
  describeServerEnvironment,
  loadServerEnvironment,
  redactEnvironment,
  redactText,
  toSafeStartupError,
} from '../dist/server.js';
import { withEnvironmentOverrides } from '../dist/testing.js';

const productionEnvironment = {
  NOMA_ENV: 'production',
  NOMA_CREDENTIAL_ENVIRONMENT: 'production',
  PUBLIC_WEB_ORIGIN: 'https://noma.example',
  API_PUBLIC_URL: 'https://api.noma.example',
  SESSION_SECRET: '0123456789abcdefghijklmnopqrstuvwxyz',
  DATABASE_URL: 'postgresql://noma:database-password@db.example:5432/noma?sslmode=require',
  REDIS_URL: 'rediss://default:redis-password@redis.example:6379',
  NOMA_RELEASE_SHA: '0123456789abcdef0123456789abcdef01234567',
};

test('public development configuration uses safe local defaults', () => {
  assert.deepEqual(loadPublicEnvironment({}), {
    applicationEnvironment: 'development',
    apiBaseUrl: 'http://127.0.0.1:3001',
  });
});

test('remote public configuration requires an HTTPS API URL', () => {
  assert.throws(
    () => loadPublicEnvironment({ NEXT_PUBLIC_NOMA_ENV: 'production' }),
    EnvironmentValidationError,
  );
  assert.throws(
    () => loadPublicEnvironment({
      NEXT_PUBLIC_NOMA_ENV: 'preview',
      NEXT_PUBLIC_API_BASE_URL: 'http://preview.example',
    }),
    EnvironmentValidationError,
  );
});

test('unapproved browser variables and secret-like names are rejected', () => {
  assert.throws(
    () => loadPublicEnvironment({
      NEXT_PUBLIC_NOMA_ENV: 'development',
      NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3001',
      NEXT_PUBLIC_PAYSTACK_SECRET_KEY: 'not-real',
    }),
    EnvironmentValidationError,
  );
});

test('development server configuration has safe defaults', () => {
  const config = loadServerEnvironment('api', {});
  assert.equal(config.applicationEnvironment, 'development');
  assert.equal(config.credentialEnvironment, 'development');
  assert.deepEqual(config.address, { host: '0.0.0.0', port: 3001 });
  assert.equal(config.publicWebOrigin, 'http://127.0.0.1:3000');
  assert.equal(config.apiPublicUrl, 'http://127.0.0.1:3001');
  assert.equal(config.providerAdapterMode, 'disabled');
  assert.equal(config.telemetry.mode, 'disabled');
  assert.equal(config.telemetry.traceSampleRatio, 0);
});

test('telemetry configuration is typed, bounded, and environment isolated', () => {
  const local = loadServerEnvironment('worker', {
    NOMA_ENV: 'test',
    NOMA_TELEMETRY_MODE: 'in-memory',
    NOMA_TELEMETRY_EXPORT_INTERVAL_MS: '5000',
  });
  assert.equal(local.telemetry.mode, 'in-memory');
  assert.equal(local.telemetry.traceSampleRatio, 1);
  assert.equal(local.telemetry.exportIntervalMilliseconds, 5000);
  assert.throws(
    () => loadServerEnvironment('worker', {
      ...productionEnvironment,
      NOMA_TELEMETRY_MODE: 'otlp',
      NOMA_TRACE_SAMPLE_RATIO: '0.25',
      NOMA_OTLP_ENDPOINT: 'http://collector.internal:4318',
      NOMA_OTLP_AUTHORIZATION: 'Bearer synthetic-but-long',
    }),
    (error) => error instanceof EnvironmentValidationError
      && error.issues.some((issue) => issue.key === 'NOMA_OTLP_ENDPOINT'),
  );
  assert.throws(
    () => loadServerEnvironment('worker', { NOMA_TELEMETRY_MODE: 'otlp' }),
    (error) => error instanceof EnvironmentValidationError
      && error.issues.some((issue) => issue.key === 'NOMA_OTLP_ENDPOINT'),
  );
  assert.throws(
    () => loadServerEnvironment('worker', {
      NOMA_TELEMETRY_MODE: 'otlp',
      NOMA_OTLP_ENDPOINT: 'http://127.0.0.1:4318',
    }),
    (error) => error instanceof EnvironmentValidationError
      && error.issues.some((issue) => issue.key === 'NOMA_TRACE_SAMPLE_RATIO'),
  );
});

test('provider adapter selection is explicit and fails closed', () => {
  assert.equal(loadServerEnvironment('api', { NOMA_PROVIDER_MODE: 'simulator' }).providerAdapterMode, 'simulator');
  assert.throws(
    () => loadServerEnvironment('api', { NOMA_PROVIDER_MODE: 'real' }),
    (error) => error instanceof EnvironmentValidationError && error.issues.some((issue) => issue.key === 'NOMA_PROVIDER_MODE'),
  );
  assert.throws(
    () => loadServerEnvironment('api', { ...productionEnvironment, NOMA_PROVIDER_MODE: 'simulator' }),
    (error) => error instanceof EnvironmentValidationError && error.issues.some((issue) => issue.code === 'environment-mismatch'),
  );
});

test('invalid explicit runtime ports fail instead of silently defaulting', () => {
  assert.throws(
    () => loadServerEnvironment('worker', { WORKER_PORT: '70000' }),
    EnvironmentValidationError,
  );
});

test('Worker database and Redis dependencies must be configured together', () => {
  assert.throws(
    () => loadServerEnvironment('worker', {
      DATABASE_URL: 'postgresql://noma:synthetic@127.0.0.1:55432/noma',
    }),
    EnvironmentValidationError,
  );
  assert.throws(
    () => loadServerEnvironment('worker', {
      REDIS_URL: 'redis://default:synthetic@127.0.0.1:56379',
    }),
    EnvironmentValidationError,
  );
});

test('API database and Redis dependencies must be configured together', () => {
  assert.throws(
    () => loadServerEnvironment('api', {
      DATABASE_URL: 'postgresql://noma:synthetic@127.0.0.1:55432/noma',
    }),
    EnvironmentValidationError,
  );
});

test('staging requires release identity, dependencies, API session secret, and encrypted database transport', () => {
  const base = {
    NOMA_ENV: 'staging',
    NOMA_CREDENTIAL_ENVIRONMENT: 'staging',
    PUBLIC_WEB_ORIGIN: 'https://noma-preview.vercel.app',
    API_PUBLIC_URL: 'https://noma-api-staging.onrender.com',
    NOMA_PROVIDER_MODE: 'disabled',
  };
  assert.throws(
    () => loadServerEnvironment('api', base),
    (error) => {
      assert.ok(error instanceof EnvironmentValidationError);
      const keys = new Set(error.issues.map((item) => item.key));
      for (const key of ['SESSION_SECRET', 'DATABASE_URL', 'REDIS_URL', 'NOMA_RELEASE_SHA']) {
        assert.ok(keys.has(key), `expected missing staging ${key}`);
      }
      return true;
    },
  );
  assert.throws(
    () => loadServerEnvironment('worker', {
      ...base,
      DATABASE_URL: 'postgresql://noma:synthetic@db.internal/noma?sslmode=require',
      REDIS_URL: 'redis://default:synthetic@redis.internal:6379',
      NOMA_RELEASE_SHA: '0123456',
    }),
    EnvironmentValidationError,
  );
  const worker = loadServerEnvironment('worker', {
    ...base,
    DATABASE_URL: 'postgresql://noma:synthetic@db.internal/noma?sslmode=require',
    REDIS_URL: 'redis://default:synthetic@redis.internal:6379',
    NOMA_RELEASE_SHA: '0123456789abcdef0123456789abcdef01234567',
  });
  assert.equal(worker.applicationEnvironment, 'staging');
  assert.equal(worker.secrets.sessionSecret, undefined);
});

test('production fails closed when critical configuration is missing', () => {
  assert.throws(
    () => loadServerEnvironment('api', {
      NOMA_ENV: 'production',
      NOMA_CREDENTIAL_ENVIRONMENT: 'production',
      PUBLIC_WEB_ORIGIN: 'https://noma.example',
      API_PUBLIC_URL: 'https://api.noma.example',
    }),
    (error) => {
      assert.ok(error instanceof EnvironmentValidationError);
      const keys = new Set(error.issues.map((issue) => issue.key));
      for (const key of ['SESSION_SECRET', 'DATABASE_URL', 'REDIS_URL', 'NOMA_RELEASE_SHA']) {
        assert.ok(keys.has(key), `expected missing ${key}`);
      }
      return true;
    },
  );
});

test('preview cannot declare production credentials or use a live Paystack key', () => {
  assert.throws(
    () => loadServerEnvironment('api', {
      NOMA_ENV: 'preview',
      NOMA_CREDENTIAL_ENVIRONMENT: 'production',
      PUBLIC_WEB_ORIGIN: 'https://preview.noma.example',
      API_PUBLIC_URL: 'https://api-preview.noma.example',
      PAYSTACK_SECRET_KEY: 'sk_live_example',
    }),
    (error) => {
      assert.ok(error instanceof EnvironmentValidationError);
      assert.ok(error.issues.some((issue) => issue.code === 'environment-mismatch'));
      return true;
    },
  );
});

test('valid production configuration is typed and serialises without secrets', () => {
  const config = loadServerEnvironment('worker', productionEnvironment);
  assert.equal(config.secrets.sessionSecret, productionEnvironment.SESSION_SECRET);
  assert.equal(config.secrets.databaseUrl?.startsWith('postgresql://'), true);
  assert.equal(config.address.port, 3002);
  assert.equal(config.providerAdapterMode, 'disabled');

  const serialised = JSON.stringify(config);
  assert.equal(serialised.includes(productionEnvironment.SESSION_SECRET), false);
  assert.equal(serialised.includes('database-password'), false);
  assert.deepEqual(describeServerEnvironment(config).configuredSecrets, {
    sessionSecret: true,
    databaseUrl: true,
    redisUrl: true,
    telemetryAuthorization: false,
  });
});

test('safe startup errors contain keys and codes but never supplied values', () => {
  const marker = 'do-not-log-this-secret';
  let captured;
  try {
    loadServerEnvironment('api', {
      ...productionEnvironment,
      SESSION_SECRET: marker,
    });
  } catch (error) {
    captured = toSafeStartupError(error);
  }

  const serialised = JSON.stringify(captured);
  assert.equal(serialised.includes(marker), false);
  assert.match(serialised, /SESSION_SECRET/);
});

test('redaction covers secret keys, credential URLs, bearer tokens, and live keys', () => {
  const redacted = redactEnvironment({
    SAFE_ID: 'abc',
    SESSION_SECRET: 'sensitive',
    DATABASE_URL: 'postgresql://user:pass@db/noma',
  });
  assert.equal(redacted.SAFE_ID, 'abc');
  assert.equal(redacted.SESSION_SECRET, '[REDACTED]');
  assert.equal(redacted.DATABASE_URL, '[REDACTED]');

  const text = redactText('Bearer abc.def sk_live_123 postgresql://user:pass@db/noma');
  assert.equal(text.includes('abc.def'), false);
  assert.equal(text.includes('sk_live_123'), false);
  assert.equal(text.includes('user:pass'), false);
});

test('test overrides are isolated and do not mutate their base input', () => {
  const base = Object.freeze({ NOMA_ENV: 'test', API_PORT: '3001', REMOVE_ME: 'yes' });
  const result = withEnvironmentOverrides(base, { API_PORT: '4101', REMOVE_ME: undefined });
  assert.equal(base.API_PORT, '3001');
  assert.equal(result.API_PORT, '4101');
  assert.equal('REMOVE_ME' in result, false);
});
