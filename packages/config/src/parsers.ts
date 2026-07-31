import {
  APPLICATION_ENVIRONMENTS,
  type ApplicationEnvironment,
  type EnvironmentSource,
  type EnvironmentValidationIssue,
} from './model.js';

const PLACEHOLDER_SECRET_PATTERN = /^(?:change[-_ ]?me|replace[-_ ]?me|example|placeholder|secret|password|todo|not[-_ ]?real)$/i;

export function readApplicationEnvironment(
  source: EnvironmentSource,
  key: string,
  fallback: ApplicationEnvironment,
  issues: EnvironmentValidationIssue[],
): ApplicationEnvironment {
  const value = source[key]?.trim();
  if (!value) return fallback;

  if ((APPLICATION_ENVIRONMENTS as readonly string[]).includes(value)) {
    return value as ApplicationEnvironment;
  }

  issues.push({
    key,
    code: 'invalid',
    message: `must be one of ${APPLICATION_ENVIRONMENTS.join(', ')}`,
  });
  return fallback;
}

export function readRequiredString(
  source: EnvironmentSource,
  key: string,
  issues: EnvironmentValidationIssue[],
  minimumLength = 1,
): string | undefined {
  const value = source[key]?.trim();
  if (!value) {
    issues.push({ key, code: 'missing', message: 'is required' });
    return undefined;
  }

  if (value.length < minimumLength) {
    issues.push({ key, code: 'invalid', message: `must contain at least ${minimumLength} characters` });
    return undefined;
  }

  return value;
}

export function readSecret(
  source: EnvironmentSource,
  key: string,
  issues: EnvironmentValidationIssue[],
  options: { readonly required: boolean; readonly minimumLength: number },
): string | undefined {
  const value = source[key]?.trim();

  if (!value) {
    if (options.required) issues.push({ key, code: 'missing', message: 'is required' });
    return undefined;
  }

  if (PLACEHOLDER_SECRET_PATTERN.test(value)) {
    issues.push({ key, code: 'placeholder-secret', message: 'must not use a placeholder value' });
    return undefined;
  }

  if (value.length < options.minimumLength) {
    issues.push({ key, code: 'invalid', message: `must contain at least ${options.minimumLength} characters` });
    return undefined;
  }

  return value;
}

export function readUrl(
  source: EnvironmentSource,
  key: string,
  issues: EnvironmentValidationIssue[],
  options: {
    readonly required: boolean;
    readonly fallback?: string;
    readonly protocols: readonly string[];
    readonly requireTls: boolean;
  },
): string | undefined {
  const raw = source[key]?.trim() || options.fallback;
  if (!raw) {
    if (options.required) issues.push({ key, code: 'missing', message: 'is required' });
    return undefined;
  }

  try {
    const url = new URL(raw);
    if (!options.protocols.includes(url.protocol)) {
      issues.push({ key, code: 'invalid', message: `must use ${options.protocols.join(' or ')}` });
      return undefined;
    }
    if (options.requireTls && !['https:', 'rediss:'].includes(url.protocol)) {
      issues.push({ key, code: 'insecure', message: 'must use encrypted transport in this environment' });
      return undefined;
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    issues.push({ key, code: 'invalid', message: 'must be a valid URL' });
    return undefined;
  }
}
