export const PROVIDER_ENVIRONMENTS = [
  'local',
  'test',
  'preview',
  'staging',
  'production',
] as const;
export const PROVIDER_ADAPTER_MODES = ['disabled', 'simulator', 'real'] as const;
export const PROVIDER_DATA_CLASSIFICATIONS = [
  'public',
  'internal',
  'personal',
  'financial',
  'sensitive',
  'audit',
] as const;

export type ProviderEnvironment = (typeof PROVIDER_ENVIRONMENTS)[number];
export type ProviderAdapterMode = (typeof PROVIDER_ADAPTER_MODES)[number];
export type ProviderDataClassification = (typeof PROVIDER_DATA_CLASSIFICATIONS)[number];
export type ProviderCapabilityState = 'available' | 'degraded' | 'disabled' | 'unavailable' | 'manual-required';
export type ProviderHealthState = 'healthy' | 'degraded' | 'unavailable' | 'disabled' | 'not-configured';
export type ProviderFinality = 'non-final' | 'final-success' | 'final-failure' | 'uncertain' | 'reversed';
export type ReconciliationRequirement = 'none' | 'required' | 'manual-review';

export interface ProviderConfiguration {
  readonly provider: string;
  readonly environment: ProviderEnvironment;
  readonly mode: ProviderAdapterMode;
  readonly enabled: boolean;
  readonly baseUrl?: string;
  readonly accountReference?: string;
  readonly region?: string;
  readonly credentialSecretReference?: string;
  readonly webhookSecretReference?: string;
  readonly connectTimeoutMilliseconds: number;
  readonly responseTimeoutMilliseconds: number;
  readonly operationDeadlineMilliseconds: number;
  readonly maximumAttempts: number;
  readonly retryPolicyReference: string;
  readonly circuitBreakerPolicyReference: string;
  readonly dataClassifications: readonly ProviderDataClassification[];
  readonly owningTeam: string;
  readonly runbookPath: string;
  readonly statusPageReference?: string;
}

export interface ProviderOperationIdentity {
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly attempt: number;
  readonly deadlineAt: string;
}

export interface ProviderRequestContext {
  readonly identity: ProviderOperationIdentity;
  readonly environment: ProviderEnvironment;
}

export interface MinorMoney {
  readonly amountMinor: number;
  readonly currency: string;
}

export interface SafeProviderError {
  readonly code: string;
  readonly classification:
    | 'transient'
    | 'ambiguous'
    | 'validation'
    | 'configuration'
    | 'business-rejection'
    | 'provider-final'
    | 'internal-conflict'
    | 'unsafe-data';
  readonly safeMessage: string;
  readonly retryable: boolean;
  readonly reconciliation: ReconciliationRequirement;
}

export type ProviderCallResult<T> =
  | { readonly kind: 'accepted'; readonly providerReference: string; readonly data: T }
  | { readonly kind: 'final_success'; readonly providerReference: string; readonly data: T }
  | {
      readonly kind: 'final_failure';
      readonly providerReference?: string;
      readonly code: string;
      readonly retryable: boolean;
    }
  | { readonly kind: 'uncertain'; readonly providerReference?: string; readonly code: string }
  | { readonly kind: 'rejected'; readonly code: string; readonly safeMessage: string };

export interface ProviderCapability {
  readonly provider: string;
  readonly capability: string;
  readonly state: ProviderCapabilityState;
  readonly environment: ProviderEnvironment;
  readonly checkedAt: string;
  readonly safeReason?: string;
}

export interface ProviderHealth {
  readonly provider: string;
  readonly state: ProviderHealthState;
  readonly checkedAt: string;
  readonly safeReason?: string;
}

export interface ProviderEventIdentity {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly receivedAt: string;
  readonly payloadHash: string;
}

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,159}$/;
const CURRENCY = /^[A-Z]{3}$/;
const CODE = /^[A-Z][A-Z0-9_]{1,79}$/;
const SECRET_KEY = /(?:password|secret|authorization|credential|private.?key|access.?token|refresh.?token|account.?number|otp|session|cookie)/i;
const UNSAFE_VALUE = [
  /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]+\b/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(?:postgres|postgresql|redis|rediss):\/\/[^\s:/]+:[^\s@]+@/i,
  /\bBearer\s+[A-Za-z0-9._~-]+/i,
];

function record(value: unknown, name: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function text(value: unknown, name: string, pattern = SAFE_ID): string {
  if (typeof value !== 'string' || !pattern.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function instant(value: unknown, name: string): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${name} must be an ISO date-time`);
  }
  return new Date(value).toISOString();
}

function exactKeys(value: Readonly<Record<string, unknown>>, allowed: readonly string[], name: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) throw new TypeError(`${name} contains unsupported fields: ${unknown.join(', ')}`);
}

export function parseProviderEnvironment(value: unknown): ProviderEnvironment {
  if (!PROVIDER_ENVIRONMENTS.includes(value as ProviderEnvironment)) {
    throw new TypeError('provider environment is invalid');
  }
  return value as ProviderEnvironment;
}

export function parseProviderOperationIdentity(value: unknown): ProviderOperationIdentity {
  const input = record(value, 'provider operation identity');
  exactKeys(input, ['operationId', 'idempotencyKey', 'correlationId', 'attempt', 'deadlineAt'], 'provider operation identity');
  const attempt = input.attempt;
  if (!Number.isSafeInteger(attempt) || (attempt as number) < 1 || (attempt as number) > 100) {
    throw new TypeError('provider operation attempt must be an integer from 1 to 100');
  }
  return Object.freeze({
    operationId: text(input.operationId, 'operationId'),
    idempotencyKey: text(input.idempotencyKey, 'idempotencyKey'),
    correlationId: text(input.correlationId, 'correlationId'),
    attempt: attempt as number,
    deadlineAt: instant(input.deadlineAt, 'deadlineAt'),
  });
}

export function parseMinorMoney(value: unknown): MinorMoney {
  const input = record(value, 'money');
  exactKeys(input, ['amountMinor', 'currency'], 'money');
  if (!Number.isSafeInteger(input.amountMinor) || (input.amountMinor as number) < 1) {
    throw new TypeError('money amountMinor must be a positive safe integer');
  }
  return Object.freeze({
    amountMinor: input.amountMinor as number,
    currency: text(input.currency, 'currency', CURRENCY),
  });
}

export function assertSafeProviderValue(value: unknown, path = 'provider value', depth = 0): void {
  if (depth > 12) throw new TypeError(`${path} exceeds the safe provider nesting limit`);
  if (typeof value === 'string') {
    if (value.length > 4_096) throw new TypeError(`${path} exceeds the safe string limit`);
    if (UNSAFE_VALUE.some((pattern) => pattern.test(value))) throw new TypeError(`${path} contains prohibited sensitive data`);
    return;
  }
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSafeProviderValue(entry, `${path}[${index}]`, depth + 1));
    return;
  }
  const input = record(value, path);
  for (const [key, child] of Object.entries(input)) {
    if (SECRET_KEY.test(key)) throw new TypeError(`${path}.${key} is prohibited`);
    assertSafeProviderValue(child, `${path}.${key}`, depth + 1);
  }
}

export function parseProviderCallResult<T>(
  value: unknown,
  parseData: (data: unknown) => T,
): ProviderCallResult<T> {
  const input = record(value, 'provider call result');
  const kind = input.kind;
  if (kind === 'accepted' || kind === 'final_success') {
    exactKeys(input, ['kind', 'providerReference', 'data'], 'provider call result');
    return Object.freeze({
      kind,
      providerReference: text(input.providerReference, 'providerReference'),
      data: parseData(input.data),
    });
  }
  if (kind === 'final_failure') {
    exactKeys(input, ['kind', 'providerReference', 'code', 'retryable'], 'provider call result');
    if (typeof input.retryable !== 'boolean') throw new TypeError('final failure retryable must be boolean');
    return Object.freeze({
      kind,
      ...(input.providerReference === undefined ? {} : { providerReference: text(input.providerReference, 'providerReference') }),
      code: text(input.code, 'provider failure code', CODE),
      retryable: input.retryable,
    });
  }
  if (kind === 'uncertain') {
    exactKeys(input, ['kind', 'providerReference', 'code'], 'provider call result');
    return Object.freeze({
      kind,
      ...(input.providerReference === undefined ? {} : { providerReference: text(input.providerReference, 'providerReference') }),
      code: text(input.code, 'provider uncertainty code', CODE),
    });
  }
  if (kind === 'rejected') {
    exactKeys(input, ['kind', 'code', 'safeMessage'], 'provider call result');
    const safeMessage = text(input.safeMessage, 'safeMessage', /^[\x20-\x7E]{1,240}$/);
    assertSafeProviderValue(safeMessage, 'safeMessage');
    return Object.freeze({ kind, code: text(input.code, 'provider rejection code', CODE), safeMessage });
  }
  throw new TypeError('provider call result kind is invalid');
}

export function parseProviderConfiguration(value: unknown): ProviderConfiguration {
  const input = record(value, 'provider configuration');
  const environment = parseProviderEnvironment(input.environment);
  const mode = input.mode;
  if (!PROVIDER_ADAPTER_MODES.includes(mode as ProviderAdapterMode)) throw new TypeError('provider mode is invalid');
  if (environment === 'production' && mode === 'simulator') throw new TypeError('production cannot select provider simulator mode');
  if (typeof input.enabled !== 'boolean') throw new TypeError('provider enabled must be boolean');
  if (mode === 'disabled' && input.enabled) throw new TypeError('disabled provider mode cannot be enabled');
  const bounded = (key: string, minimum: number, maximum: number): number => {
    const item = input[key];
    if (!Number.isSafeInteger(item) || (item as number) < minimum || (item as number) > maximum) {
      throw new TypeError(`${key} must be an integer from ${minimum} to ${maximum}`);
    }
    return item as number;
  };
  const configuration: ProviderConfiguration = {
    provider: text(input.provider, 'provider'),
    environment,
    mode: mode as ProviderAdapterMode,
    enabled: input.enabled,
    ...(input.baseUrl === undefined ? {} : { baseUrl: text(input.baseUrl, 'baseUrl', /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[^\s]*)?$/) }),
    ...(input.accountReference === undefined ? {} : { accountReference: text(input.accountReference, 'accountReference') }),
    ...(input.region === undefined ? {} : { region: text(input.region, 'region') }),
    ...(input.credentialSecretReference === undefined ? {} : { credentialSecretReference: text(input.credentialSecretReference, 'credentialSecretReference') }),
    ...(input.webhookSecretReference === undefined ? {} : { webhookSecretReference: text(input.webhookSecretReference, 'webhookSecretReference') }),
    connectTimeoutMilliseconds: bounded('connectTimeoutMilliseconds', 1, 120_000),
    responseTimeoutMilliseconds: bounded('responseTimeoutMilliseconds', 1, 300_000),
    operationDeadlineMilliseconds: bounded('operationDeadlineMilliseconds', 1, 900_000),
    maximumAttempts: bounded('maximumAttempts', 1, 20),
    retryPolicyReference: text(input.retryPolicyReference, 'retryPolicyReference'),
    circuitBreakerPolicyReference: text(input.circuitBreakerPolicyReference, 'circuitBreakerPolicyReference'),
    dataClassifications: Object.freeze((input.dataClassifications as unknown[] | undefined)?.map((item) => {
      if (!PROVIDER_DATA_CLASSIFICATIONS.includes(item as ProviderDataClassification)) throw new TypeError('provider data classification is invalid');
      return item as ProviderDataClassification;
    }) ?? []),
    owningTeam: text(input.owningTeam, 'owningTeam'),
    runbookPath: text(input.runbookPath, 'runbookPath'),
    ...(input.statusPageReference === undefined ? {} : { statusPageReference: text(input.statusPageReference, 'statusPageReference') }),
  };
  return Object.freeze(configuration);
}
