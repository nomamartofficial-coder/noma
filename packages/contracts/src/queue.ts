export const QUEUE_NAMES = [
  'provider-events',
  'payments-reconciliation',
  'refunds-reconciliation',
  'payouts-reconciliation',
  'notifications',
  'email',
  'sms',
  'search-index',
  'files',
  'reservation-expiry',
  'protection-timers',
  'operations-escalation',
  'analytics-export',
  'maintenance',
] as const;

export const PRIVACY_CLASSIFICATIONS = [
  'public',
  'account-private',
  'institution-sensitive',
  'seller-confidential',
  'financial',
  'custody-safety',
  'case-evidence',
  'security-secret',
  'audit',
  'projection-analytics',
] as const;

export const ATTENTION_OWNERS = ['operations', 'finance', 'security'] as const;
export const JOB_FAILURE_CLASSIFICATIONS = ['retryable', 'permanent'] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];
export type PrivacyClassification = (typeof PRIVACY_CLASSIFICATIONS)[number];
export type AttentionOwner = (typeof ATTENTION_OWNERS)[number];
export type JobFailureClassification = (typeof JOB_FAILURE_CLASSIFICATIONS)[number];

export interface OutboxEventEnvelopeV1<TPayload = unknown> {
  readonly schemaVersion: 1;
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly aggregate: {
    readonly type: string;
    readonly id: string;
    readonly version: string;
  };
  readonly institutionId?: string;
  readonly scope?: {
    readonly type: string;
    readonly id: string;
  };
  readonly payload: TPayload;
  readonly privacyClassification: PrivacyClassification;
  readonly servicePrincipal: string;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly availableAt: string;
}

export interface QueueRetryPolicy {
  readonly attempts: number;
  readonly backoff: 'exponential';
  readonly backoffDelayMilliseconds: number;
  readonly jitter: number;
  readonly timeoutMilliseconds: number;
}

export interface QueueDeadLetterPolicy {
  readonly owner: AttentionOwner;
  readonly attentionAfterMilliseconds: number;
  readonly recoveryAction: 'review-and-replay';
}

export interface QueueIdempotencyPolicy {
  readonly identity: 'outbox-event-id';
  readonly completedDelivery: 'no-op';
  readonly effectCommit: 'same-database-transaction';
}

export interface QueueSuccessEvidencePolicy {
  readonly store: 'postgresql-job-executions';
  readonly outcome: 'completed';
}

export interface QueueJobContract<TPayload> {
  readonly queueName: QueueName;
  readonly jobName: string;
  readonly schemaVersion: number;
  readonly privacyClassification: PrivacyClassification;
  readonly authorizedServicePrincipals: readonly string[];
  readonly idempotency: QueueIdempotencyPolicy;
  readonly successEvidence: QueueSuccessEvidencePolicy;
  readonly observabilityAttributes: readonly string[];
  readonly retry: QueueRetryPolicy;
  readonly deadLetter: QueueDeadLetterPolicy;
  readonly parsePayload: (value: unknown) => TPayload;
}

export interface QueueJobEnvelopeV1<TPayload = unknown> {
  readonly schemaVersion: 1;
  readonly jobId: string;
  readonly jobName: string;
  readonly jobVersion: number;
  readonly queueName: QueueName;
  readonly event: OutboxEventEnvelopeV1<TPayload>;
  readonly servicePrincipal: string;
  readonly correlationId: string;
}

export interface SafeJobFailure {
  readonly classification: JobFailureClassification;
  readonly code: string;
  readonly message: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_NAME_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const SAFE_IDENTITY_PATTERN = /^[a-z][a-z0-9_-]{1,119}$/i;
const SAFE_ATTRIBUTE_PATTERN = /^[a-z][a-z0-9_.-]{0,79}$/;
const SECRET_PAYLOAD_KEY_PATTERN = /(?:password|secret|authorization|credential|private.?key|access.?token|refresh.?token)/i;
const MAXIMUM_PAYLOAD_BYTES = 32_768;

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function fail(subject: string, detail: string): never {
  throw new Error(`${subject} ${detail}`);
}

function record(value: unknown, subject: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(subject, 'must be an object');
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, subject: string, maximumLength: number): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximumLength) {
    fail(subject, `must be a non-empty string of at most ${maximumLength} characters`);
  }
  return value;
}

function positiveInteger(value: unknown, subject: string, maximum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > maximum) {
    fail(subject, `must be an integer from 1 to ${maximum}`);
  }
  return value as number;
}

function nonNegativeIntegerString(value: unknown, subject: string): string {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value)) {
    fail(subject, 'must be a non-negative integer string');
  }
  return value;
}

function isoTimestamp(value: unknown, subject: string): string {
  const timestamp = stringValue(value, subject, 40);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(timestamp) || Number.isNaN(Date.parse(timestamp))) {
    fail(subject, 'must be an ISO-8601 timestamp');
  }
  return timestamp;
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  subject: string,
  values: T,
): T[number] {
  if (typeof value !== 'string' || !values.includes(value)) {
    fail(subject, `must be one of ${values.join(', ')}`);
  }
  return value as T[number];
}

function uuid(value: unknown, subject: string): string {
  const id = stringValue(value, subject, 36);
  if (!UUID_PATTERN.test(id)) fail(subject, 'must be a UUID');
  return id;
}

function assertPrivacySafePayload(value: unknown, path = 'payload', depth = 0): void {
  if (depth > 8) fail('outbox event payload', 'must not exceed eight nested levels');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    if (value.length > 1_000) fail('outbox event payload', 'must not exceed 1000 array entries');
    value.forEach((entry, index) => assertPrivacySafePayload(entry, `${path}[${index}]`, depth + 1));
    return;
  }
  if (typeof value !== 'object') fail('outbox event payload', 'must contain only JSON values');
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 100) fail('outbox event payload', 'must not exceed 100 object fields');
  for (const [key, entry] of entries) {
    if (SECRET_PAYLOAD_KEY_PATTERN.test(key)) {
      fail('outbox event payload', `must reference rather than embed secret field ${path}.${key}`);
    }
    assertPrivacySafePayload(entry, `${path}.${key}`, depth + 1);
  }
}

function safeName(value: unknown, subject: string, maximumLength: number): string {
  const name = stringValue(value, subject, maximumLength);
  if (!SAFE_NAME_PATTERN.test(name)) fail(subject, 'must use a stable lowercase dotted or hyphenated name');
  return name;
}

export function parseOutboxEventEnvelope(value: unknown): OutboxEventEnvelopeV1 {
  const input = record(value, 'outbox event');
  if (input.schemaVersion !== 1) fail('outbox event schemaVersion', 'must equal 1');
  if (!Object.prototype.hasOwnProperty.call(input, 'payload')) {
    fail('outbox event payload', 'is required');
  }
  assertPrivacySafePayload(input.payload);
  if (utf8ByteLength(JSON.stringify(input.payload)) > MAXIMUM_PAYLOAD_BYTES) {
    fail('outbox event payload', `must not exceed ${MAXIMUM_PAYLOAD_BYTES} encoded bytes`);
  }

  const aggregate = record(input.aggregate, 'outbox event aggregate');
  const scope = input.scope === undefined ? undefined : record(input.scope, 'outbox event scope');
  const institutionId = input.institutionId === undefined
    ? undefined
    : uuid(input.institutionId, 'outbox event institutionId');

  return Object.freeze({
    schemaVersion: 1,
    eventId: uuid(input.eventId, 'outbox event eventId'),
    eventType: safeName(input.eventType, 'outbox event eventType', 160),
    eventVersion: positiveInteger(input.eventVersion, 'outbox event eventVersion', 1_000),
    aggregate: Object.freeze({
      type: safeName(aggregate.type, 'outbox event aggregate type', 100),
      id: stringValue(aggregate.id, 'outbox event aggregate id', 200),
      version: nonNegativeIntegerString(aggregate.version, 'outbox event aggregate version'),
    }),
    ...(institutionId ? { institutionId } : {}),
    ...(scope
      ? {
          scope: Object.freeze({
            type: safeName(scope.type, 'outbox event scope type', 80),
            id: stringValue(scope.id, 'outbox event scope id', 200),
          }),
        }
      : {}),
    payload: input.payload,
    privacyClassification: enumValue(
      input.privacyClassification,
      'outbox event privacyClassification',
      PRIVACY_CLASSIFICATIONS,
    ),
    servicePrincipal: (() => {
      const identity = stringValue(input.servicePrincipal, 'outbox event servicePrincipal', 120);
      if (!SAFE_IDENTITY_PATTERN.test(identity)) fail('outbox event servicePrincipal', 'must be a safe service identity');
      return identity;
    })(),
    correlationId: stringValue(input.correlationId, 'outbox event correlationId', 200),
    occurredAt: isoTimestamp(input.occurredAt, 'outbox event occurredAt'),
    availableAt: isoTimestamp(input.availableAt, 'outbox event availableAt'),
  });
}

export function defineQueueJobContract<TPayload>(
  contract: QueueJobContract<TPayload>,
): QueueJobContract<TPayload> {
  enumValue(contract.queueName, 'job contract queueName', QUEUE_NAMES);
  safeName(contract.jobName, 'job contract jobName', 160);
  positiveInteger(contract.schemaVersion, 'job contract schemaVersion', 1_000);
  enumValue(contract.privacyClassification, 'job contract privacyClassification', PRIVACY_CLASSIFICATIONS);
  if (!Array.isArray(contract.authorizedServicePrincipals) || contract.authorizedServicePrincipals.length === 0) {
    fail('job contract authorizedServicePrincipals', 'must contain at least one service identity');
  }
  for (const identityValue of contract.authorizedServicePrincipals) {
    const identity = stringValue(identityValue, 'job contract service principal', 120);
    if (!SAFE_IDENTITY_PATTERN.test(identity)) fail('job contract service principal', 'must be a safe service identity');
  }
  if (new Set(contract.authorizedServicePrincipals).size !== contract.authorizedServicePrincipals.length) {
    fail('job contract authorizedServicePrincipals', 'must not contain duplicate identities');
  }
  if (
    contract.idempotency.identity !== 'outbox-event-id'
    || contract.idempotency.completedDelivery !== 'no-op'
    || contract.idempotency.effectCommit !== 'same-database-transaction'
  ) {
    fail('job contract idempotency', 'must use PostgreSQL outbox-event identity and atomic effects');
  }
  if (
    contract.successEvidence.store !== 'postgresql-job-executions'
    || contract.successEvidence.outcome !== 'completed'
  ) {
    fail('job contract success evidence', 'must use a completed PostgreSQL job execution');
  }
  if (!Array.isArray(contract.observabilityAttributes) || contract.observabilityAttributes.length === 0) {
    fail('job contract observabilityAttributes', 'must contain bounded safe attribute names');
  }
  for (const attribute of contract.observabilityAttributes) {
    if (typeof attribute !== 'string' || !SAFE_ATTRIBUTE_PATTERN.test(attribute)) {
      fail('job contract observability attribute', 'must be a safe stable name');
    }
  }
  positiveInteger(contract.retry.attempts, 'job contract retry attempts', 10);
  if (contract.retry.backoff !== 'exponential') fail('job contract backoff', 'must be exponential');
  positiveInteger(contract.retry.backoffDelayMilliseconds, 'job contract backoff delay', 60_000);
  if (contract.retry.jitter < 0 || contract.retry.jitter > 1) fail('job contract jitter', 'must be from 0 to 1');
  positiveInteger(contract.retry.timeoutMilliseconds, 'job contract timeout', 600_000);
  enumValue(contract.deadLetter.owner, 'job contract dead-letter owner', ATTENTION_OWNERS);
  positiveInteger(
    contract.deadLetter.attentionAfterMilliseconds,
    'job contract attention deadline',
    604_800_000,
  );
  if (contract.deadLetter.recoveryAction !== 'review-and-replay') {
    fail('job contract recovery action', 'must be review-and-replay');
  }
  if (typeof contract.parsePayload !== 'function') fail('job contract parsePayload', 'must be a function');
  return Object.freeze(contract);
}

export function createQueueJobEnvelope<TPayload>(
  contract: QueueJobContract<TPayload>,
  eventValue: unknown,
): QueueJobEnvelopeV1<TPayload> {
  const event = parseOutboxEventEnvelope(eventValue);
  if (event.privacyClassification !== contract.privacyClassification) {
    fail('queue job privacyClassification', 'must match its registered contract');
  }
  if (!contract.authorizedServicePrincipals.includes(event.servicePrincipal)) {
    fail('queue job servicePrincipal', 'is not authorized by its registered contract');
  }
  const payload = contract.parsePayload(event.payload);
  const typedEvent = Object.freeze({ ...event, payload }) as OutboxEventEnvelopeV1<TPayload>;
  return Object.freeze({
    schemaVersion: 1,
    jobId: event.eventId,
    jobName: contract.jobName,
    jobVersion: contract.schemaVersion,
    queueName: contract.queueName,
    event: typedEvent,
    servicePrincipal: event.servicePrincipal,
    correlationId: event.correlationId,
  });
}

export function parseQueueJobEnvelope<TPayload>(
  value: unknown,
  contract: QueueJobContract<TPayload>,
): QueueJobEnvelopeV1<TPayload> {
  const input = record(value, 'queue job');
  if (input.schemaVersion !== 1) fail('queue job schemaVersion', 'must equal 1');
  const jobId = uuid(input.jobId, 'queue job jobId');
  if (jobId.includes(':')) fail('queue job jobId', 'must not contain a colon');
  if (input.jobName !== contract.jobName) fail('queue job jobName', 'does not match its contract');
  if (input.jobVersion !== contract.schemaVersion) fail('queue job jobVersion', 'does not match its contract');
  if (input.queueName !== contract.queueName) fail('queue job queueName', 'does not match its contract');

  const envelope = createQueueJobEnvelope(contract, input.event);
  if (envelope.jobId !== jobId) fail('queue job jobId', 'must equal the outbox event ID');
  if (input.servicePrincipal !== envelope.servicePrincipal) {
    fail('queue job servicePrincipal', 'must equal the outbox event service principal');
  }
  if (input.correlationId !== envelope.correlationId) {
    fail('queue job correlationId', 'must equal the outbox event correlation ID');
  }
  return envelope;
}

export function toSafeJobFailure(
  classification: JobFailureClassification,
  code: string,
  message: string,
): SafeJobFailure {
  const safeCode = stringValue(code, 'job failure code', 120);
  if (!/^[A-Z][A-Z0-9_]*$/.test(safeCode)) fail('job failure code', 'must be an uppercase stable code');
  const safeMessage = stringValue(message, 'job failure message', 500)
    .replace(/(?:redis|rediss|postgres|postgresql):\/\/\S+/gi, '[REDACTED_URL]')
    .replace(/(password|secret|token|authorization)=?\s*\S+/gi, '$1=[REDACTED]');
  return Object.freeze({ classification, code: safeCode, message: safeMessage });
}
