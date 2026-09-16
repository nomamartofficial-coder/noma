import type { AuthenticationAssuranceRequirement } from '../../identity/index.js';
import type { AuthorizationFactRequirement } from './contracts.js';

const POLICY_KEY = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;

export const NOT_APPLICABLE = Object.freeze({ applicability: 'NOT_APPLICABLE' as const });

export function requirePolicyKey(value: string): string {
  if (value.length > 160 || !POLICY_KEY.test(value) || value.includes('*')) {
    throw new Error('Policy identifiers and fact keys must be exact lowercase dotted values without wildcards');
  }
  return value;
}

export function requiredFacts(...keys: readonly string[]): AuthorizationFactRequirement {
  if (keys.length === 0) throw new Error('A required fact dimension must name at least one key');
  const canonical = keys.map(requirePolicyKey);
  if (new Set(canonical).size !== canonical.length) throw new Error('Required fact keys must be unique');
  return Object.freeze({ applicability: 'REQUIRED' as const, keys: Object.freeze(canonical) });
}

function boundedMaximumAge(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Assurance maximum age must be a positive safe integer');
  return value;
}

export function combineAuthenticationAssuranceRequirements(
  baseline: AuthenticationAssuranceRequirement,
  action: AuthenticationAssuranceRequirement,
): AuthenticationAssuranceRequirement {
  const baselinePassword = boundedMaximumAge(baseline.passwordMaxAgeMilliseconds);
  const actionPassword = boundedMaximumAge(action.passwordMaxAgeMilliseconds);
  const baselineMfa = boundedMaximumAge(baseline.mfaMaxAgeMilliseconds);
  const actionMfa = boundedMaximumAge(action.mfaMaxAgeMilliseconds);
  const minimum = (left: number | undefined, right: number | undefined) => left === undefined
    ? right
    : right === undefined ? left : Math.min(left, right);
  const passwordMaxAgeMilliseconds = minimum(baselinePassword, actionPassword);
  const mfaMaxAgeMilliseconds = minimum(baselineMfa, actionMfa);
  return Object.freeze({
    requireContactVerified: baseline.requireContactVerified || action.requireContactVerified,
    ...(passwordMaxAgeMilliseconds === undefined ? {} : { passwordMaxAgeMilliseconds }),
    ...(mfaMaxAgeMilliseconds === undefined ? {} : { mfaMaxAgeMilliseconds }),
  });
}
