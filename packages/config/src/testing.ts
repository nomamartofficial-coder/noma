import type { EnvironmentSource } from './model.js';

export function withEnvironmentOverrides(
  base: EnvironmentSource,
  overrides: EnvironmentSource,
): EnvironmentSource {
  const merged: Record<string, string | undefined> = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete merged[key];
    else merged[key] = value;
  }

  return Object.freeze(merged);
}
