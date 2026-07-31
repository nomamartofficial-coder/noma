import { EnvironmentValidationError } from './errors.js';
import type { ApplicationEnvironment, EnvironmentSource, EnvironmentValidationIssue } from './model.js';
import { readApplicationEnvironment, readUrl } from './parsers.js';
import { isSecretEnvironmentKey } from './redaction.js';

const ALLOWED_PUBLIC_KEYS = new Set([
  'NEXT_PUBLIC_NOMA_ENV',
  'NEXT_PUBLIC_API_BASE_URL',
]);

export interface PublicRuntimeConfig {
  readonly applicationEnvironment: ApplicationEnvironment;
  readonly apiBaseUrl: string;
}

export function detectPublicApplicationEnvironment(source: EnvironmentSource): ApplicationEnvironment {
  const explicit = source.NEXT_PUBLIC_NOMA_ENV?.trim();
  if (explicit) return explicit as ApplicationEnvironment;

  const vercel = source.VERCEL_ENV?.trim();
  if (vercel === 'production' || vercel === 'preview') return vercel;
  return 'development';
}

export function loadPublicEnvironment(source: EnvironmentSource): PublicRuntimeConfig {
  const issues: EnvironmentValidationIssue[] = [];
  const fallback = detectPublicApplicationEnvironment(source);
  const applicationEnvironment = readApplicationEnvironment(
    source,
    'NEXT_PUBLIC_NOMA_ENV',
    fallback,
    issues,
  );

  for (const [key, value] of Object.entries(source)) {
    if (!value) continue;
    if (key.startsWith('NEXT_PUBLIC_') && !ALLOWED_PUBLIC_KEYS.has(key)) {
      issues.push({
        key,
        code: 'unexpected-public-variable',
        message: 'is not an approved browser-exposed environment variable',
      });
    }
    if (key.startsWith('NEXT_PUBLIC_') && isSecretEnvironmentKey(key)) {
      issues.push({
        key,
        code: 'unexpected-public-variable',
        message: 'looks secret-bearing and must remain server-only',
      });
    }
  }

  const remote = ['preview', 'staging', 'production'].includes(applicationEnvironment);
  const apiBaseUrl = readUrl(source, 'NEXT_PUBLIC_API_BASE_URL', issues, {
    required: remote,
    ...(remote ? {} : { fallback: 'http://127.0.0.1:3001' }),
    protocols: ['http:', 'https:'],
    requireTls: remote,
  });

  if (issues.length > 0 || !apiBaseUrl) throw new EnvironmentValidationError(issues);

  return Object.freeze({ applicationEnvironment, apiBaseUrl });
}

export const publicConfigBoundary = 'browser-safe' as const;
export { EnvironmentValidationError } from './errors.js';
export type { ApplicationEnvironment, EnvironmentSource } from './model.js';
