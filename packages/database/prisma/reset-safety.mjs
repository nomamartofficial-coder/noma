export const LOCAL_DATABASE_URL =
  'postgresql://noma:noma-local-dev-only@127.0.0.1:55432/noma?schema=public';
export const DATABASE_RESET_CONFIRMATION = 'RESET_LOCAL_NOMA_DATABASE';

const REMOTE_ENVIRONMENTS = new Set(['preview', 'staging', 'production']);
const RESET_ENVIRONMENTS = new Set(['development', 'test']);
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function parsePostgreSqlUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol');
  }

  return parsed;
}

function applicationEnvironment(source) {
  return source.NOMA_ENV?.trim() || 'development';
}

export function resolvePrismaDatabaseUrl(source) {
  const environment = applicationEnvironment(source);
  const raw = source.DATABASE_URL?.trim();

  if (!raw) {
    if (REMOTE_ENVIRONMENTS.has(environment)) {
      throw new Error('DATABASE_URL is required for remote database commands');
    }
    return LOCAL_DATABASE_URL;
  }

  const parsed = parsePostgreSqlUrl(raw);
  if (environment === 'production') {
    const sslMode = parsed.searchParams.get('sslmode');
    const ssl = parsed.searchParams.get('ssl');
    if (!['require', 'verify-ca', 'verify-full'].includes(sslMode ?? '') && ssl !== 'true') {
      throw new Error('production DATABASE_URL must require encrypted PostgreSQL transport');
    }
  }

  return raw;
}

export function isPrismaResetCommand(argv) {
  const normalized = argv.map((value) => value.trim().toLowerCase());
  const migrateIndex = normalized.lastIndexOf('migrate');
  return migrateIndex >= 0 && normalized[migrateIndex + 1] === 'reset';
}

export function assertDatabaseResetAllowed(source) {
  const environment = source.NOMA_ENV?.trim();
  const credentialEnvironment = source.NOMA_CREDENTIAL_ENVIRONMENT?.trim();
  const failures = [];

  if (!environment || !RESET_ENVIRONMENTS.has(environment)) {
    failures.push('NOMA_ENV must explicitly be development or test');
  }
  if (!credentialEnvironment || credentialEnvironment !== environment) {
    failures.push('NOMA_CREDENTIAL_ENVIRONMENT must explicitly match NOMA_ENV');
  }
  if (source.NOMA_DATABASE_RESET_CONFIRMATION !== DATABASE_RESET_CONFIRMATION) {
    failures.push('NOMA_DATABASE_RESET_CONFIRMATION is missing or invalid');
  }

  const raw = source.DATABASE_URL?.trim();
  let target;
  if (!raw) {
    failures.push('DATABASE_URL must be explicit for reset operations');
  } else {
    try {
      target = parsePostgreSqlUrl(raw);
    } catch (error) {
      failures.push(error.message);
    }
  }

  if (target) {
    if (!LOOPBACK_HOSTS.has(target.hostname.toLowerCase())) {
      failures.push('database reset target must be a loopback host');
    }

    const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ''));
    if (!/^noma(?:[_-](?:local|dev|test|ci)(?:[_-][a-z0-9-]+)?)?$/i.test(databaseName)) {
      failures.push('database reset target must use an approved local/test Noma database name');
    }
  }

  if (failures.length > 0) {
    throw new Error(`database reset refused: ${failures.join('; ')}`);
  }

  return Object.freeze({
    applicationEnvironment: environment,
    databaseName: decodeURIComponent(target.pathname.replace(/^\//, '')),
    hostname: target.hostname,
  });
}
