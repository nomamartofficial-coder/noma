import { DeterministicTestIds } from './random.js';
import type { FixtureContext } from './fixtures.js';

export const SYNTHETIC_PERSONA_KEYS = [
  'guest',
  'unverified-account',
  'verified-covenant-buyer',
  'covenant-manual-review-applicant',
  'student-vendor-owner',
  'campus-store-owner',
  'campus-store-operator',
  'external-vendor',
  'noma-rider',
  'cu-express-rider',
  'cu-express-dispatcher',
  'support-agent',
  'operations-agent',
  'catalogue-reviewer',
  'fbn-operator',
  'finance-maker',
  'finance-checker',
  'trust-safety-investigator',
  'institution-admin',
  'access-admin',
  'security-admin',
  'platform-admin',
  'super-admin',
  'worker-service-principal',
  'outbox-service-principal',
  'provider-callback-service-principal',
] as const;

export const SYNTHETIC_PERSONA_STATUSES = ['active', 'expired', 'suspended', 'revoked'] as const;

export type SyntheticPersonaKey = (typeof SYNTHETIC_PERSONA_KEYS)[number];
export type SyntheticPersonaStatus = (typeof SYNTHETIC_PERSONA_STATUSES)[number];

const PRIVILEGED_PERSONAS = new Set<SyntheticPersonaKey>([
  'access-admin',
  'security-admin',
  'platform-admin',
  'super-admin',
]);

export interface SyntheticPersona {
  readonly fixtureVersion: 1;
  readonly synthetic: true;
  readonly personaKey: SyntheticPersonaKey;
  readonly status: SyntheticPersonaStatus;
  readonly actorId: string;
  readonly displayName: string;
  readonly email?: string;
  readonly institutionKey?: 'covenant-university-test';
  readonly servicePrincipal?: string;
  readonly privileged: boolean;
}

function displayName(key: SyntheticPersonaKey): string {
  return key.split('-').map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`).join(' ');
}

export function createSyntheticPersona(
  context: FixtureContext,
  key: SyntheticPersonaKey,
  options: {
    readonly status?: SyntheticPersonaStatus;
    readonly allowPrivileged?: boolean;
  } = {},
): SyntheticPersona {
  if (!SYNTHETIC_PERSONA_KEYS.includes(key)) throw new Error(`unknown synthetic persona: ${key}`);
  const privileged = PRIVILEGED_PERSONAS.has(key);
  if (privileged && options.allowPrivileged !== true) {
    throw new Error(`${key} requires explicit privileged-persona opt-in`);
  }
  const servicePrincipal = key.endsWith('service-principal');
  const ids = new DeterministicTestIds(`${context.seed}:${key}:${options.status ?? 'active'}`);
  return Object.freeze({
    fixtureVersion: 1,
    synthetic: true,
    personaKey: key,
    status: options.status ?? 'active',
    actorId: ids.nextUuid(),
    displayName: displayName(key),
    ...(servicePrincipal
      ? { servicePrincipal: `test_${key.replace(/-/g, '_')}` }
      : {
          email: `${key}@noma.test`,
          institutionKey: 'covenant-university-test' as const,
        }),
    privileged,
  });
}
