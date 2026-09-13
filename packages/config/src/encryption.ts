import { EnvironmentValidationError } from './errors.js';
import type { ApplicationEnvironment, EnvironmentSource, EnvironmentValidationIssue } from './model.js';
import { APPLICATION_ENVIRONMENTS } from './model.js';

export type EncryptionRuntime = 'api' | 'worker' | 'web' | 'migration' | 'test';
export type EncryptionMode = 'disabled' | 'test-only' | 'aws-kms';

export interface EncryptionEnvironmentConfiguration {
  readonly mode: EncryptionMode;
  readonly runtime: EncryptionRuntime;
  readonly environment: ApplicationEnvironment;
  readonly purposes: readonly string[];
  readonly keyReference?: string;
  readonly destinationKeyReferences: readonly string[];
  /** Never serialize an identity token path or role ARN into diagnostics. */
  toJSON(): Readonly<Record<string, unknown>>;
}

const KEY_ARN = /^arn:aws:kms:eu-central-1:[0-9]{12}:key\/[0-9a-f-]{36}$/i;
const ROLE_ARN = /^arn:aws:iam::[0-9]{12}:role\/[A-Za-z0-9_+=,.@\/-]{1,512}$/;
const PURPOSE = /^noma:[a-z][a-z0-9-]{0,79}$/;
const STATIC_CREDENTIAL_KEYS = [
  'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_PROFILE',
  'AWS_SHARED_CREDENTIALS_FILE', 'AWS_CONFIG_FILE', 'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI',
  'AWS_CONTAINER_CREDENTIALS_FULL_URI',
];

/** Opt-in source configuration. Existing runtimes remain disabled until a governed consumer is wired. */
export function loadEncryptionEnvironment(runtime: EncryptionRuntime, source: EnvironmentSource): EncryptionEnvironmentConfiguration {
  const issues: EnvironmentValidationIssue[] = [];
  const rawEnvironment = source.NOMA_ENV?.trim() || 'development';
  if (!(APPLICATION_ENVIRONMENTS as readonly string[]).includes(rawEnvironment)) {
    issues.push({ key: 'NOMA_ENV', code: 'invalid', message: 'must be a recognised Noma environment' });
  }
  const environment = (APPLICATION_ENVIRONMENTS as readonly string[]).includes(rawEnvironment)
    ? rawEnvironment as ApplicationEnvironment : 'development';
  const credentialEnvironment = source.NOMA_CREDENTIAL_ENVIRONMENT?.trim() || environment;
  if (credentialEnvironment !== environment) {
    issues.push({ key: 'NOMA_CREDENTIAL_ENVIRONMENT', code: 'environment-mismatch', message: 'must match NOMA_ENV' });
  }
  const rawMode = source.NOMA_ENCRYPTION_MODE?.trim() || 'disabled';
  if (!['disabled', 'test-only', 'aws-kms'].includes(rawMode)) {
    issues.push({ key: 'NOMA_ENCRYPTION_MODE', code: 'invalid', message: 'must be disabled, test-only, or aws-kms' });
  }
  const mode = ['disabled', 'test-only', 'aws-kms'].includes(rawMode) ? rawMode as EncryptionMode : 'disabled';
  const remote = ['preview', 'staging', 'production'].includes(environment);
  if (mode === 'test-only' && (remote || !['api', 'migration', 'test'].includes(runtime))) {
    issues.push({ key: 'NOMA_ENCRYPTION_MODE', code: 'environment-mismatch', message: 'test-only keys are restricted to local/test server work' });
  }
  if (mode === 'aws-kms' && (!['staging', 'production'].includes(environment) || !['api', 'migration'].includes(runtime))) {
    issues.push({ key: 'NOMA_ENCRYPTION_MODE', code: 'environment-mismatch', message: 'AWS KMS is restricted to approved staging/production API or migration identities' });
  }
  if (mode !== 'disabled' && ['worker', 'web'].includes(runtime)) {
    issues.push({ key: 'NOMA_ENCRYPTION_MODE', code: 'invalid', message: 'this runtime has no encryption authority' });
  }
  const rawPurposes = source.NOMA_ENCRYPTION_PURPOSES?.trim();
  const purposes = rawPurposes ? rawPurposes.split(',').map((value) => value.trim()) : [];
  if (mode !== 'disabled' && (purposes.length === 0 || purposes.length > 8 || purposes.some((value) => !PURPOSE.test(value)) || new Set(purposes).size !== purposes.length)) {
    issues.push({ key: 'NOMA_ENCRYPTION_PURPOSES', code: 'invalid', message: 'must list unique approved cryptographic purposes' });
  }
  const keyReference = source.NOMA_KMS_KEY_ARN?.trim();
  const destinationKeyReferences = source.NOMA_KMS_DESTINATION_KEY_ARNS?.split(',').map((value) => value.trim()) ?? [];
  if (mode === 'aws-kms') {
    if (!keyReference || !KEY_ARN.test(keyReference)) issues.push({ key: 'NOMA_KMS_KEY_ARN', code: 'invalid', message: 'requires a eu-central-1 customer-managed key ARN' });
    if (!ROLE_ARN.test(source.AWS_ROLE_ARN?.trim() ?? '')) issues.push({ key: 'AWS_ROLE_ARN', code: 'invalid', message: 'requires a workload role ARN' });
    if (!source.AWS_WEB_IDENTITY_TOKEN_FILE?.trim()) issues.push({ key: 'AWS_WEB_IDENTITY_TOKEN_FILE', code: 'missing', message: 'requires a managed OIDC token file' });
    if (destinationKeyReferences.some((value) => !KEY_ARN.test(value)) || (destinationKeyReferences.length && runtime !== 'migration')) {
      issues.push({ key: 'NOMA_KMS_DESTINATION_KEY_ARNS', code: 'invalid', message: 'destination keys are migration-only Frankfurt key ARNs' });
    }
  } else if (keyReference || destinationKeyReferences.length || source.AWS_ROLE_ARN || source.AWS_WEB_IDENTITY_TOKEN_FILE) {
    issues.push({ key: 'NOMA_ENCRYPTION_MODE', code: 'invalid', message: 'key identity settings require aws-kms mode' });
  }
  for (const key of STATIC_CREDENTIAL_KEYS) {
    if (source[key]) issues.push({ key, code: 'insecure', message: 'static or alternate AWS credential sources are prohibited' });
  }
  if (issues.length) throw new EnvironmentValidationError(issues);
  const config = {
    mode, runtime, environment,
    purposes: Object.freeze(purposes),
    ...(keyReference ? { keyReference } : {}),
    destinationKeyReferences: Object.freeze(destinationKeyReferences),
    toJSON: () => Object.freeze({ mode, runtime, environment, purposeCount: purposes.length, keyConfigured: Boolean(keyReference), destinationKeyCount: destinationKeyReferences.length }),
  };
  return Object.freeze(config);
}
