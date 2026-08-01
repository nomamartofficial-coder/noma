import {
  assertSafeProviderValue,
  parseMinorMoney,
  parseProviderCallResult,
  parseProviderEnvironment,
  parseProviderOperationIdentity,
  type AnalyticsProviderPort,
  type BankAccountProviderPort,
  type BeneficiaryProviderPort,
  type DeferredProviderPort,
  type DnsConfigurationProviderPort,
  type HostingConfigurationProviderPort,
  type MonitoringProviderPort,
  type NomaProviderPorts,
  type ObjectStorageProviderPort,
  type OperationalTelemetryProviderPort,
  type PaymentProviderPort,
  type ProviderCallResult,
  type ProviderEventMapperPort,
  type ProviderRequestContext,
  type ProviderWebhookVerifierPort,
  type RefundProviderPort,
  type TransactionalEmailProviderPort,
  type TransferProviderPort,
  type WebPushProviderPort,
} from '@noma/platform/providers';

export const PROVIDER_SIMULATOR_OPERATIONS = [
  'payment.initialise', 'payment.retrieve', 'payment-event.verify', 'payment-event.map',
  'refund.submit', 'refund.retrieve', 'bank.list', 'bank.resolve', 'beneficiary.create',
  'transfer.initiate', 'transfer.finalise', 'transfer.retrieve',
  'storage.create-upload', 'storage.inspect', 'storage.create-read', 'storage.quarantine', 'storage.delete-test',
  'email.send', 'email.map-event', 'email.suppression', 'push.send',
  'monitoring.capture-exception', 'monitoring.capture-message', 'monitoring.flush',
  'analytics.capture', 'analytics.flush', 'telemetry.record', 'telemetry.flush',
  'hosting.inspect', 'dns.validate-intent', 'deferred.capability',
] as const;

export type ProviderSimulatorOperation = (typeof PROVIDER_SIMULATOR_OPERATIONS)[number];
export type SimulatorAcceptance = 'not-sent' | 'possibly-accepted' | 'accepted';

export interface ProviderSimulatorScenario {
  readonly result: unknown;
  readonly latencyMilliseconds?: number;
  readonly acceptance?: SimulatorAcceptance;
  readonly event?: {
    readonly eventId: string;
    readonly status: string;
    readonly sequence: number;
    readonly duplicateOf?: string;
    readonly correctionOf?: string;
  };
}

export interface ProviderSimulatorOutcomeSource {
  next(signal?: AbortSignal): Promise<ProviderSimulatorScenario>;
  reset?(): void;
}

export interface ProviderSimulatorClock { now(): Date; }
export interface ProviderSimulatorScheduler {
  wait(milliseconds: number, signal?: AbortSignal): Promise<void>;
}

export interface ProviderSimulatorCallSnapshot {
  readonly sequence: number;
  readonly operation: ProviderSimulatorOperation;
  readonly operationId: string;
  readonly correlationId: string;
  readonly environment: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly duplicate: boolean;
  readonly outcomeKind: string;
  readonly providerReference?: string;
  readonly safeSummary: Readonly<Record<string, string | number | boolean>>;
}

export interface ProviderSimulatorEventSnapshot {
  readonly sequence: number;
  readonly operation: ProviderSimulatorOperation;
  readonly eventId: string;
  readonly status: string;
  readonly duplicateOf?: string;
  readonly correctionOf?: string;
}

export interface ProviderSimulatorSnapshot {
  readonly calls: readonly ProviderSimulatorCallSnapshot[];
  readonly events: readonly ProviderSimulatorEventSnapshot[];
}

export interface ProviderSimulatorInspector {
  snapshot(): ProviderSimulatorSnapshot;
  reset(): void;
  toJSON(): Readonly<{ kind: 'noma-provider-simulator'; callCount: number; eventCount: number }>;
}

export interface CreateProviderSimulatorOptions {
  readonly clock: ProviderSimulatorClock;
  readonly scheduler: ProviderSimulatorScheduler;
  readonly scripts: Readonly<Partial<Record<ProviderSimulatorOperation, ProviderSimulatorOutcomeSource>>>;
}

type PrimitiveSummary = Readonly<Record<string, string | number | boolean>>;

function immutable<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) immutable(child);
  return Object.freeze(value);
}

function validateContext(input: ProviderRequestContext): ProviderRequestContext {
  return Object.freeze({
    identity: parseProviderOperationIdentity(input.identity),
    environment: parseProviderEnvironment(input.environment),
  });
}

function parseSafeData<T>(data: unknown): T {
  assertSafeProviderValue(data, 'provider result data');
  return immutable(structuredClone(data)) as T;
}

function safeReference(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]{2,159}$/.test(value)) {
    throw new TypeError(`${name} is invalid`);
  }
  return value;
}

function safeInstant(value: unknown, name: string): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new TypeError(`${name} is invalid`);
  return new Date(value).toISOString();
}

function validBytes(value: unknown, name: string): Uint8Array {
  if (!(value instanceof Uint8Array) || value.byteLength === 0 || value.byteLength > 256 * 1024) {
    throw new TypeError(`${name} must contain 1 to 262144 bytes`);
  }
  return value;
}

class ProviderSimulatorKernel {
  readonly #clock: ProviderSimulatorClock;
  readonly #scheduler: ProviderSimulatorScheduler;
  readonly #scripts: CreateProviderSimulatorOptions['scripts'];
  readonly #calls: ProviderSimulatorCallSnapshot[] = [];
  readonly #events: ProviderSimulatorEventSnapshot[] = [];
  readonly #replay = new Map<string, ProviderCallResult<unknown>>();
  #sequence = 0;

  constructor(options: CreateProviderSimulatorOptions) {
    this.#clock = options.clock;
    this.#scheduler = options.scheduler;
    this.#scripts = options.scripts;
  }

  async run<T>(
    operation: ProviderSimulatorOperation,
    contextInput: ProviderRequestContext,
    safeSummary: PrimitiveSummary,
    signal?: AbortSignal,
  ): Promise<ProviderCallResult<T>> {
    assertSafeProviderValue(safeSummary, 'simulator call summary');
    const context = validateContext(contextInput);
    const startedAt = this.#clock.now().toISOString();
    const existing = this.#replay.get(context.identity.operationId);
    if (existing) {
      const replayed = existing as ProviderCallResult<T>;
      this.#recordCall(operation, context, safeSummary, startedAt, replayed, true);
      return replayed;
    }

    const source = this.#scripts[operation];
    if (!source) throw new Error(`unsupported provider simulator operation: ${operation}`);
    let scenario: ProviderSimulatorScenario;
    try {
      scenario = await source.next(signal);
    } catch {
      const result = Object.freeze({
        kind: signal?.aborted ? 'rejected' as const : 'final_failure' as const,
        code: signal?.aborted ? 'ABORTED_BEFORE_ACCEPTANCE' : 'SIMULATOR_SCRIPT_FAILURE',
        ...(signal?.aborted ? { safeMessage: 'provider operation was aborted before acceptance' } : { retryable: false }),
      }) as ProviderCallResult<T>;
      this.#recordCall(operation, context, safeSummary, startedAt, result, false);
      return result;
    }

    const latency = scenario.latencyMilliseconds ?? 0;
    if (!Number.isSafeInteger(latency) || latency < 0 || latency > 900_000) {
      throw new TypeError('simulator latency must be an integer from 0 to 900000 milliseconds');
    }
    const acceptance = scenario.acceptance ?? 'not-sent';
    const deadline = Date.parse(context.identity.deadlineAt);
    const wouldExceedDeadline = this.#clock.now().getTime() + latency > deadline;
    if (signal?.aborted || wouldExceedDeadline) {
      const result = this.#interrupted<T>(acceptance, signal?.aborted ? 'ABORTED' : 'DEADLINE_EXPIRED');
      if (acceptance !== 'not-sent') this.#replay.set(context.identity.operationId, result as ProviderCallResult<unknown>);
      this.#recordCall(operation, context, safeSummary, startedAt, result, false);
      return result;
    }
    try {
      if (latency > 0) await this.#scheduler.wait(latency, signal);
    } catch {
      const result = this.#interrupted<T>(acceptance, 'ABORTED');
      if (acceptance !== 'not-sent') this.#replay.set(context.identity.operationId, result as ProviderCallResult<unknown>);
      this.#recordCall(operation, context, safeSummary, startedAt, result, false);
      return result;
    }

    const result = parseProviderCallResult<T>(scenario.result, parseSafeData<T>);
    this.#replay.set(context.identity.operationId, result as ProviderCallResult<unknown>);
    if (scenario.event) {
      const event = immutable({ operation, ...scenario.event });
      assertSafeProviderValue(event, 'simulator event');
      this.#events.push(event);
    }
    this.#recordCall(operation, context, safeSummary, startedAt, result, false);
    return result;
  }

  #interrupted<T>(acceptance: SimulatorAcceptance, reason: 'ABORTED' | 'DEADLINE_EXPIRED'): ProviderCallResult<T> {
    if (acceptance === 'possibly-accepted' || acceptance === 'accepted') {
      return Object.freeze({ kind: 'uncertain', code: `${reason}_AFTER_POSSIBLE_ACCEPTANCE` });
    }
    return Object.freeze({ kind: 'rejected', code: `${reason}_BEFORE_ACCEPTANCE`, safeMessage: 'provider operation did not reach confirmed acceptance' });
  }

  #recordCall<T>(operation: ProviderSimulatorOperation, context: ProviderRequestContext, safeSummary: PrimitiveSummary, startedAt: string, result: ProviderCallResult<T>, duplicate: boolean): void {
    this.#sequence += 1;
    const providerReference = 'providerReference' in result ? result.providerReference : undefined;
    this.#calls.push(immutable({
      sequence: this.#sequence,
      operation,
      operationId: context.identity.operationId,
      correlationId: context.identity.correlationId,
      environment: context.environment,
      startedAt,
      completedAt: this.#clock.now().toISOString(),
      duplicate,
      outcomeKind: result.kind,
      ...(providerReference ? { providerReference } : {}),
      safeSummary: { ...safeSummary },
    }));
  }

  snapshot(): ProviderSimulatorSnapshot {
    return immutable(structuredClone({ calls: this.#calls, events: this.#events }));
  }

  reset(): void {
    this.#calls.length = 0;
    this.#events.length = 0;
    this.#replay.clear();
    this.#sequence = 0;
    for (const source of Object.values(this.#scripts)) source?.reset?.();
  }
}

export function createLocalProviderSimulators(options: CreateProviderSimulatorOptions): {
  readonly ports: NomaProviderPorts;
  readonly inspector: ProviderSimulatorInspector;
} {
  const kernel = new ProviderSimulatorKernel(options);
  const run = <T>(operation: ProviderSimulatorOperation, input: ProviderRequestContext, summary: PrimitiveSummary, signal?: AbortSignal) =>
    kernel.run<T>(operation, input, summary, signal);

  const payment: PaymentProviderPort = {
    initialisePayment: (input, signal) => {
      parseMinorMoney(input.expectedMoney);
      return run('payment.initialise', input, { reference: safeReference(input.internalReference, 'payment reference'), amountMinor: input.expectedMoney.amountMinor, currency: input.expectedMoney.currency }, signal);
    },
    retrievePayment: (input, signal) => {
      parseMinorMoney(input.expectedMoney);
      return run('payment.retrieve', input, { reference: safeReference(input.internalReference, 'payment reference'), amountMinor: input.expectedMoney.amountMinor, currency: input.expectedMoney.currency }, signal);
    },
  };
  const paymentWebhook: ProviderWebhookVerifierPort & ProviderEventMapperPort = {
    verifyEvent: (input, signal) => {
      validBytes(input.rawBody, 'webhook raw body');
      if (typeof input.signature !== 'string' || input.signature.length < 8 || input.signature.length > 512) throw new TypeError('webhook signature is invalid');
      return run('payment-event.verify', input, { eventReference: safeReference(input.eventReference, 'event reference'), payloadBytes: input.rawBody.byteLength }, signal);
    },
    mapEvent: (input, signal) => {
      validBytes(input.rawBody, 'webhook raw body');
      return run('payment-event.map', input, { eventReference: safeReference(input.eventReference, 'event reference'), payloadBytes: input.rawBody.byteLength }, signal);
    },
  };
  const refund: RefundProviderPort = {
    submitRefund: (input, signal) => {
      if (input.money) parseMinorMoney(input.money);
      return run('refund.submit', input, { reference: safeReference(input.internalReference, 'refund reference'), fullRefund: input.money === undefined, ...(input.money ? { amountMinor: input.money.amountMinor, currency: input.money.currency } : {}) }, signal);
    },
    retrieveRefund: (input, signal) => run('refund.retrieve', input, { providerRefundReference: safeReference(input.providerRefundReference, 'refund provider reference') }, signal),
  };
  const bankAccount: BankAccountProviderPort = {
    listBanks: (input, signal) => run('bank.list', input, { country: input.country, currency: input.currency }, signal),
    resolveAccount: (input, signal) => {
      if (!/^\d{10}$/.test(input.accountNumber)) throw new TypeError('account number must contain exactly 10 digits');
      return run('bank.resolve', input, { bankCode: safeReference(input.bankCode, 'bank code'), maskedAccount: `******${input.accountNumber.slice(-4)}` }, signal);
    },
  };
  const beneficiary: BeneficiaryProviderPort = {
    createBeneficiary: (input, signal) => {
      if (!/^\d{10}$/.test(input.accountNumber)) throw new TypeError('account number must contain exactly 10 digits');
      return run('beneficiary.create', input, { internalAccountReference: safeReference(input.internalAccountReference, 'internal account reference'), bankCode: safeReference(input.bankCode, 'bank code'), maskedAccount: `******${input.accountNumber.slice(-4)}` }, signal);
    },
  };
  const transfer: TransferProviderPort = {
    initiateTransfer: (input, signal) => {
      parseMinorMoney(input.money);
      return run('transfer.initiate', input, { reference: safeReference(input.internalReference, 'transfer reference'), beneficiaryReference: safeReference(input.beneficiaryReference, 'beneficiary reference'), amountMinor: input.money.amountMinor, currency: input.money.currency }, signal);
    },
    finaliseTransfer: (input, signal) => {
      safeReference(input.authorizationReference, 'authorization reference');
      return run('transfer.finalise', input, { providerReference: safeReference(input.providerReference, 'transfer provider reference'), approvalProvided: true }, signal);
    },
    retrieveTransfer: (input, signal) => run('transfer.retrieve', input, { reference: safeReference(input.internalReference, 'transfer reference') }, signal),
  };
  const storage: ObjectStorageProviderPort = {
    createUploadOperation: (input, signal) => {
      safeInstant(input.expiresAt, 'upload expiry');
      if (!Number.isSafeInteger(input.maximumBytes) || input.maximumBytes < 1 || input.maximumBytes > 50_000_000) throw new TypeError('upload maximumBytes is invalid');
      return run('storage.create-upload', input, { objectKey: safeReference(input.objectKey, 'object key'), method: input.method, contentType: input.contentType, maximumBytes: input.maximumBytes }, signal);
    },
    inspectObject: (input, signal) => run('storage.inspect', input, { objectReference: safeReference(input.objectReference, 'object reference') }, signal),
    createReadOperation: (input, signal) => {
      safeInstant(input.expiresAt, 'read expiry');
      return run('storage.create-read', input, { objectReference: safeReference(input.objectReference, 'object reference') }, signal);
    },
    quarantineObject: (input, signal) => run('storage.quarantine', input, { objectReference: safeReference(input.objectReference, 'object reference'), safeReasonCode: safeReference(input.safeReasonCode, 'safe reason') }, signal),
    deleteTestObject: (input, signal) => {
      if (!['local', 'test'].includes(input.environment)) throw new Error('test object deletion is restricted to local/test provider environments');
      return run('storage.delete-test', input, { objectReference: safeReference(input.objectReference, 'object reference') }, signal);
    },
  };
  const email: TransactionalEmailProviderPort = {
    sendEmail: (input, signal) => {
      assertSafeProviderValue(input.variables, 'email variables');
      assertSafeProviderValue(input.metadata, 'email metadata');
      return run('email.send', input, { messageIdentity: safeReference(input.messageIdentity, 'message identity'), templateKey: safeReference(input.templateKey, 'template key'), templateVersion: safeReference(input.templateVersion, 'template version'), recipientReference: safeReference(input.recipientReference, 'recipient reference') }, signal);
    },
    mapDeliveryEvent: (input, signal) => {
      validBytes(input.rawBody, 'email event raw body');
      return run('email.map-event', input, { eventReference: safeReference(input.eventReference, 'event reference'), payloadBytes: input.rawBody.byteLength }, signal);
    },
    lookupSuppression: (input, signal) => run('email.suppression', input, { recipientReference: safeReference(input.recipientReference, 'recipient reference') }, signal),
  };
  const push: WebPushProviderPort = {
    sendPush: (input, signal) => {
      assertSafeProviderValue(input.safePayload, 'push payload');
      return run('push.send', input, { notificationIdentity: safeReference(input.notificationIdentity, 'notification identity'), subscriptionReference: safeReference(input.subscriptionReference, 'subscription reference'), category: safeReference(input.category, 'notification category') }, signal);
    },
  };
  const monitoring: MonitoringProviderPort = {
    captureException: (input, signal) => {
      assertSafeProviderValue(input, 'monitoring exception');
      return run('monitoring.capture-exception', input, { errorName: safeReference(input.errorName, 'error name'), correlationId: input.context.correlationId }, signal);
    },
    captureMessage: (input, signal) => {
      assertSafeProviderValue(input, 'monitoring message');
      return run('monitoring.capture-message', input, { level: input.level, correlationId: input.context.correlationId }, signal);
    },
    flush: (input, signal) => run('monitoring.flush', input, {}, signal),
  };
  const analytics: AnalyticsProviderPort = {
    captureEvent: (input, signal) => {
      assertSafeProviderValue(input.event, 'analytics event');
      return run('analytics.capture', input, { eventName: safeReference(input.event.eventName, 'analytics event name'), schemaVersion: input.event.schemaVersion, correlationId: input.event.correlationId }, signal);
    },
    flush: (input, signal) => run('analytics.flush', input, {}, signal),
  };
  const telemetry: OperationalTelemetryProviderPort = {
    record: (input, signal) => {
      assertSafeProviderValue(input.telemetry, 'operational telemetry');
      return run('telemetry.record', input, { kind: input.telemetry.kind, name: safeReference(input.telemetry.name, 'telemetry name') }, signal);
    },
    flush: (input, signal) => run('telemetry.flush', input, {}, signal),
  };
  const hosting: HostingConfigurationProviderPort = {
    inspectConfiguration: (input, signal) => run('hosting.inspect', input, { provider: input.provider, serviceReference: safeReference(input.serviceReference, 'hosting service reference'), expectedEnvironment: input.expectedEnvironment }, signal),
  };
  const dns: DnsConfigurationProviderPort = {
    validateIntent: (input, signal) => run('dns.validate-intent', input, { provider: input.provider, zoneReference: safeReference(input.zoneReference, 'DNS zone reference'), recordType: input.intent.recordType, nameReference: safeReference(input.intent.nameReference, 'DNS name reference'), targetReference: safeReference(input.intent.targetReference, 'DNS target reference'), proxied: input.intent.proxied }, signal),
  };
  const deferred: DeferredProviderPort = {
    getCapability: (input, signal) => run('deferred.capability', input, { capability: input.capability }, signal),
  };

  const ports = immutable({ payment, paymentWebhook, refund, bankAccount, beneficiary, transfer, storage, email, push, monitoring, analytics, telemetry, hosting, dns, deferred });
  const inspector: ProviderSimulatorInspector = Object.freeze({
    snapshot: () => kernel.snapshot(),
    reset: () => kernel.reset(),
    toJSON: () => Object.freeze({ kind: 'noma-provider-simulator', callCount: kernel.snapshot().calls.length, eventCount: kernel.snapshot().events.length }),
  });
  return Object.freeze({ ports, inspector });
}
