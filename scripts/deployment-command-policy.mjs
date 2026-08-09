const ENCRYPTED_POSTGRESQL_MODES = new Set(['require', 'verify-ca', 'verify-full']);

export const MIGRATION_GATE_TIMEOUT_MS = 15 * 60 * 1_000;
export const MIGRATION_GATE_INITIAL_DELAY_MS = 1_000;
export const MIGRATION_GATE_MAX_DELAY_MS = 15_000;

function singleParameter(parsed, name) {
  const matches = [...parsed.searchParams.entries()].filter(([key]) => key.toLowerCase() === name);
  if (matches.length > 1 || matches.some(([key]) => key !== name)) {
    throw new Error(`staging database configuration has ambiguous ${name} settings`);
  }
  return matches[0]?.[1];
}

export function requireEncryptedPostgreSqlUrl(raw) {
  if (!raw?.trim()) throw new Error('staging database configuration is required');

  let parsed;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error('staging database configuration must be a valid PostgreSQL URL');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('staging database configuration must use PostgreSQL');
  }

  const sslMode = singleParameter(parsed, 'sslmode');
  const ssl = singleParameter(parsed, 'ssl');
  if (ssl !== undefined && ssl.trim().toLowerCase() !== 'true') {
    throw new Error('staging database configuration must not disable encrypted PostgreSQL transport');
  }
  if (ssl !== undefined) parsed.searchParams.delete('ssl');

  if (sslMode === undefined) {
    parsed.searchParams.set('sslmode', 'require');
    return parsed.toString();
  }

  const normalizedMode = sslMode.trim().toLowerCase();
  if (!ENCRYPTED_POSTGRESQL_MODES.has(normalizedMode)) {
    throw new Error('staging database configuration must use an encrypted PostgreSQL sslmode');
  }
  parsed.searchParams.set('sslmode', normalizedMode);
  return parsed.toString();
}

function abortableDelay(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const complete = () => {
      signal?.removeEventListener('abort', abort);
      resolve();
    };
    const timer = setTimeout(complete, milliseconds);
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(signal.reason instanceof Error ? signal.reason : new Error('migration gate aborted'));
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}

export async function waitForCommittedMigrations({
  check,
  timeoutMs = MIGRATION_GATE_TIMEOUT_MS,
  initialDelayMs = MIGRATION_GATE_INITIAL_DELAY_MS,
  maxDelayMs = MIGRATION_GATE_MAX_DELAY_MS,
  now = Date.now,
  delay = abortableDelay,
  onRetry = () => undefined,
  signal,
}) {
  if (typeof check !== 'function') throw new TypeError('migration gate check must be a function');
  for (const [name, value] of Object.entries({ timeoutMs, initialDelayMs, maxDelayMs })) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive safe integer`);
  }

  const startedAt = now();
  let attempts = 0;
  while (true) {
    if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('migration gate aborted');
    attempts += 1;
    if (await check()) {
      return Object.freeze({ attempts, elapsedMs: Math.max(0, now() - startedAt) });
    }

    const elapsedMs = Math.max(0, now() - startedAt);
    const remainingMs = timeoutMs - elapsedMs;
    if (remainingMs <= 0) {
      throw new Error('committed database migrations were not ready before the deployment deadline');
    }

    const exponent = Math.min(attempts - 1, 30);
    const delayMs = Math.min(initialDelayMs * (2 ** exponent), maxDelayMs, remainingMs);
    onRetry(Object.freeze({ attempts, delayMs, remainingMs }));
    await delay(delayMs, signal);
  }
}
