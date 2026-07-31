import type { EnvironmentValidationIssue } from './model.js';

export class EnvironmentValidationError extends Error {
  readonly issues: readonly EnvironmentValidationIssue[];

  constructor(issues: readonly EnvironmentValidationIssue[]) {
    const summary = issues.map((issue) => `${issue.key}: ${issue.message}`).join('; ');
    super(`Environment validation failed: ${summary}`);
    this.name = 'EnvironmentValidationError';
    this.issues = Object.freeze([...issues]);
  }
}

export interface SafeStartupError {
  readonly event: 'runtime.configuration.invalid' | 'runtime.startup.failed';
  readonly error: string;
  readonly issues?: readonly Pick<EnvironmentValidationIssue, 'key' | 'code' | 'message'>[];
}

export function toSafeStartupError(error: unknown): SafeStartupError {
  if (error instanceof EnvironmentValidationError) {
    return {
      event: 'runtime.configuration.invalid',
      error: error.name,
      issues: error.issues.map(({ key, code, message }) => ({ key, code, message })),
    };
  }

  return {
    event: 'runtime.startup.failed',
    error: error instanceof Error ? error.name : 'UnknownError',
  };
}
