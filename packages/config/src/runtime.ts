import type { EnvironmentSource, EnvironmentValidationIssue, RuntimeAddress, RuntimeName } from './model.js';

const DEFAULT_PORTS: Readonly<Record<RuntimeName, number>> = {
  web: 3000,
  api: 3001,
  worker: 3002,
};

function parsePort(
  key: string,
  raw: string | undefined,
  fallback: number,
  issues: EnvironmentValidationIssue[],
): number {
  if (raw === undefined || raw.trim() === '') return fallback;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    issues.push({
      key,
      code: 'invalid',
      message: 'must be an integer between 1 and 65535',
    });
    return fallback;
  }

  return parsed;
}

export function resolveRuntimeAddress(
  runtime: RuntimeName,
  environment: EnvironmentSource,
  issues: EnvironmentValidationIssue[] = [],
): RuntimeAddress {
  const scopedKey = `${runtime.toUpperCase()}_PORT`;
  const scopedPort = environment[scopedKey];
  const portKey = scopedPort === undefined ? 'PORT' : scopedKey;

  return Object.freeze({
    host: environment.HOST?.trim() || '0.0.0.0',
    port: parsePort(portKey, scopedPort ?? environment.PORT, DEFAULT_PORTS[runtime], issues),
  });
}

export type { RuntimeAddress, RuntimeName } from './model.js';
