import type {
  MinorMoney,
  ProviderCallResult,
  ProviderCapability,
  ProviderDataClassification,
  ProviderEnvironment,
  ProviderEventIdentity,
  ProviderRequestContext,
  ReconciliationRequirement,
} from './common.js';

export type ProviderStatus =
  | 'pending'
  | 'ongoing'
  | 'processing'
  | 'abandoned'
  | 'failed'
  | 'reversed'
  | 'successful'
  | 'needs-attention'
  | 'otp-required'
  | 'queued'
  | 'blocked'
  | 'rejected'
  | 'unknown';

export interface PaymentInitialisation {
  readonly status: 'initialised';
  readonly checkoutAccessReference: string;
}
export interface PaymentObservation {
  readonly status: Extract<ProviderStatus, 'pending' | 'ongoing' | 'abandoned' | 'failed' | 'reversed' | 'successful' | 'unknown'>;
  readonly observedMoney?: MinorMoney;
  readonly observedEnvironment: ProviderEnvironment;
  readonly reconciliation: ReconciliationRequirement;
}
export interface InitialisePaymentInput extends ProviderRequestContext {
  readonly internalReference: string;
  readonly expectedMoney: MinorMoney;
  readonly payerContactReference: string;
  readonly callbackUrlReference: string;
  readonly metadata: Readonly<Record<string, string>>;
}
export interface RetrievePaymentInput extends ProviderRequestContext {
  readonly internalReference: string;
  readonly providerReference?: string;
  readonly expectedMoney: MinorMoney;
}
export interface PaymentProviderPort {
  initialisePayment(input: InitialisePaymentInput, signal?: AbortSignal): Promise<ProviderCallResult<PaymentInitialisation>>;
  retrievePayment(input: RetrievePaymentInput, signal?: AbortSignal): Promise<ProviderCallResult<PaymentObservation>>;
}

export interface ProviderWebhookInput extends ProviderRequestContext {
  readonly eventReference: string;
  readonly rawBody: Uint8Array;
  readonly signature: string;
  readonly receivedAt: string;
}
export interface VerifiedProviderEvent {
  readonly authentic: boolean;
  readonly signatureVersion: string;
  readonly payloadHash: string;
}
export interface ProviderEventProjection {
  readonly identity: ProviderEventIdentity;
  readonly aggregateReference?: string;
  readonly status: ProviderStatus;
  readonly providerReference?: string;
  readonly money?: MinorMoney;
  readonly reconciliation: ReconciliationRequirement;
}
export interface ProviderWebhookVerifierPort {
  verifyEvent(input: ProviderWebhookInput, signal?: AbortSignal): Promise<ProviderCallResult<VerifiedProviderEvent>>;
}
export interface ProviderEventMapperPort {
  mapEvent(input: ProviderWebhookInput, signal?: AbortSignal): Promise<ProviderCallResult<ProviderEventProjection>>;
}

export interface SubmitRefundInput extends ProviderRequestContext {
  readonly internalReference: string;
  readonly originalPaymentReference: string;
  readonly money?: MinorMoney;
}
export interface RefundObservation {
  readonly status: Extract<ProviderStatus, 'pending' | 'processing' | 'successful' | 'failed' | 'needs-attention' | 'reversed' | 'unknown'>;
  readonly money?: MinorMoney;
  readonly reconciliation: ReconciliationRequirement;
}
export interface RefundProviderPort {
  submitRefund(input: SubmitRefundInput, signal?: AbortSignal): Promise<ProviderCallResult<RefundObservation>>;
  retrieveRefund(input: ProviderRequestContext & { readonly providerRefundReference: string }, signal?: AbortSignal): Promise<ProviderCallResult<RefundObservation>>;
}

export interface BankDescriptor {
  readonly bankCode: string;
  readonly displayName: string;
  readonly country: 'NG';
  readonly currency: 'NGN';
}
export interface ResolveBankAccountInput extends ProviderRequestContext {
  readonly bankCode: string;
  readonly accountNumber: string;
}
export interface ResolvedBankAccount {
  readonly bankCode: string;
  readonly maskedAccount: string;
  readonly accountName: string;
  readonly match: 'resolved' | 'mismatch';
}
export interface BankAccountProviderPort {
  listBanks(input: ProviderRequestContext & { readonly country: 'NG'; readonly currency: 'NGN' }, signal?: AbortSignal): Promise<ProviderCallResult<readonly BankDescriptor[]>>;
  resolveAccount(input: ResolveBankAccountInput, signal?: AbortSignal): Promise<ProviderCallResult<ResolvedBankAccount>>;
}
export interface CreateBeneficiaryInput extends ProviderRequestContext {
  readonly internalAccountReference: string;
  readonly bankCode: string;
  readonly accountNumber: string;
  readonly accountName: string;
}
export interface BeneficiaryReference { readonly beneficiaryReference: string; readonly status: 'created' | 'rejected'; }
export interface BeneficiaryProviderPort {
  createBeneficiary(input: CreateBeneficiaryInput, signal?: AbortSignal): Promise<ProviderCallResult<BeneficiaryReference>>;
}
export interface TransferObservation {
  readonly status: Extract<ProviderStatus, 'pending' | 'otp-required' | 'queued' | 'successful' | 'failed' | 'reversed' | 'blocked' | 'rejected' | 'unknown'>;
  readonly money: MinorMoney;
  readonly beneficiaryReference: string;
  readonly reconciliation: ReconciliationRequirement;
  readonly bankCreditVisibility: 'not-evidenced' | 'provider-confirmed-attempt';
}
export interface InitiateTransferInput extends ProviderRequestContext {
  readonly internalReference: string;
  readonly beneficiaryReference: string;
  readonly money: MinorMoney;
}
export interface TransferProviderPort {
  initiateTransfer(input: InitiateTransferInput, signal?: AbortSignal): Promise<ProviderCallResult<TransferObservation>>;
  finaliseTransfer(input: ProviderRequestContext & { readonly providerReference: string; readonly authorizationReference: string }, signal?: AbortSignal): Promise<ProviderCallResult<TransferObservation>>;
  retrieveTransfer(input: ProviderRequestContext & { readonly internalReference: string; readonly providerReference?: string }, signal?: AbortSignal): Promise<ProviderCallResult<TransferObservation>>;
}

export interface CreateUploadOperationInput extends ProviderRequestContext {
  readonly objectKey: string;
  readonly method: 'PUT' | 'POST';
  readonly contentType: string;
  readonly maximumBytes: number;
  readonly expiresAt: string;
  readonly classification: ProviderDataClassification;
}
export interface StorageAccessOperation {
  readonly operationReference: string;
  readonly objectReference: string;
  readonly method: 'PUT' | 'POST' | 'GET';
  readonly expiresAt: string;
  readonly bearerAccessReference: string;
}
export interface StoredObjectObservation {
  readonly objectReference: string;
  readonly state: 'present' | 'missing' | 'quarantined' | 'rejected' | 'unknown';
  readonly contentType?: string;
  readonly sizeBytes?: number;
  readonly checksumReference?: string;
}
export interface ObjectStorageProviderPort {
  createUploadOperation(input: CreateUploadOperationInput, signal?: AbortSignal): Promise<ProviderCallResult<StorageAccessOperation>>;
  inspectObject(input: ProviderRequestContext & { readonly objectReference: string }, signal?: AbortSignal): Promise<ProviderCallResult<StoredObjectObservation>>;
  createReadOperation(input: ProviderRequestContext & { readonly objectReference: string; readonly expiresAt: string }, signal?: AbortSignal): Promise<ProviderCallResult<StorageAccessOperation>>;
  quarantineObject(input: ProviderRequestContext & { readonly objectReference: string; readonly safeReasonCode: string }, signal?: AbortSignal): Promise<ProviderCallResult<StoredObjectObservation>>;
  deleteTestObject(input: ProviderRequestContext & { readonly objectReference: string }, signal?: AbortSignal): Promise<ProviderCallResult<{ readonly deleted: boolean }>>;
}

export interface TransactionalEmailInput extends ProviderRequestContext {
  readonly messageIdentity: string;
  readonly templateKey: string;
  readonly templateVersion: string;
  readonly recipientReference: string;
  readonly locale: string;
  readonly variables: Readonly<Record<string, string | number | boolean>>;
  readonly metadata: Readonly<Record<string, string>>;
}
export interface EmailObservation {
  readonly status: 'accepted' | 'delivered' | 'delayed' | 'rejected' | 'hard-bounce' | 'soft-bounce' | 'complained' | 'suppressed' | 'template-failure' | 'unknown';
  readonly messageIdentity: string;
}
export interface TransactionalEmailProviderPort {
  sendEmail(input: TransactionalEmailInput, signal?: AbortSignal): Promise<ProviderCallResult<EmailObservation>>;
  mapDeliveryEvent(input: ProviderWebhookInput, signal?: AbortSignal): Promise<ProviderCallResult<EmailObservation>>;
  lookupSuppression(input: ProviderRequestContext & { readonly recipientReference: string }, signal?: AbortSignal): Promise<ProviderCallResult<{ readonly suppressed: boolean; readonly safeReason?: string }>>;
}

export interface WebPushInput extends ProviderRequestContext {
  readonly notificationIdentity: string;
  readonly subscriptionReference: string;
  readonly category: string;
  readonly safePayload: Readonly<Record<string, string | number | boolean>>;
}
export interface WebPushObservation { readonly status: 'accepted' | 'transient-failure' | 'gone' | 'invalid' | 'disabled' | 'unknown'; }
export interface WebPushProviderPort {
  sendPush(input: WebPushInput, signal?: AbortSignal): Promise<ProviderCallResult<WebPushObservation>>;
}

export interface DiagnosticContext {
  readonly correlationId: string;
  readonly releaseReference?: string;
  readonly tags: Readonly<Record<string, string>>;
  readonly extra?: Readonly<Record<string, unknown>>;
}
export interface MonitoringProviderPort {
  captureException(input: ProviderRequestContext & { readonly errorName: string; readonly safeMessage: string; readonly context: DiagnosticContext }, signal?: AbortSignal): Promise<ProviderCallResult<{ readonly captured: boolean }>>;
  captureMessage(input: ProviderRequestContext & { readonly safeMessage: string; readonly level: 'debug' | 'info' | 'warning' | 'error'; readonly context: DiagnosticContext }, signal?: AbortSignal): Promise<ProviderCallResult<{ readonly captured: boolean }>>;
  flush(input: ProviderRequestContext, signal?: AbortSignal): Promise<ProviderCallResult<{ readonly flushed: boolean }>>;
}

export interface AnalyticsEvent {
  readonly eventName: string;
  readonly schemaVersion: number;
  readonly occurredAt: string;
  readonly actorReference?: string;
  readonly environment: ProviderEnvironment;
  readonly correlationId: string;
  readonly featureContext?: string;
  readonly properties: Readonly<Record<string, string | number | boolean | null>>;
}
export interface AnalyticsProviderPort {
  captureEvent(input: ProviderRequestContext & { readonly event: AnalyticsEvent }, signal?: AbortSignal): Promise<ProviderCallResult<{ readonly disposition: 'accepted' | 'buffered' | 'dropped' }>>;
  flush(input: ProviderRequestContext, signal?: AbortSignal): Promise<ProviderCallResult<{ readonly flushed: boolean }>>;
}

export type OperationalTelemetryInput =
  | { readonly kind: 'counter'; readonly name: string; readonly value: number; readonly attributes: Readonly<Record<string, string>> }
  | { readonly kind: 'gauge'; readonly name: string; readonly value: number; readonly attributes: Readonly<Record<string, string>> }
  | { readonly kind: 'histogram'; readonly name: string; readonly value: number; readonly unit: string; readonly attributes: Readonly<Record<string, string>> }
  | { readonly kind: 'span'; readonly name: string; readonly startedAt: string; readonly endedAt: string; readonly attributes: Readonly<Record<string, string>> }
  | { readonly kind: 'event'; readonly name: string; readonly occurredAt: string; readonly attributes: Readonly<Record<string, string>> };
export interface OperationalTelemetryProviderPort {
  record(input: ProviderRequestContext & { readonly telemetry: OperationalTelemetryInput }, signal?: AbortSignal): Promise<ProviderCallResult<{ readonly recorded: boolean }>>;
  flush(input: ProviderRequestContext, signal?: AbortSignal): Promise<ProviderCallResult<{ readonly flushed: boolean }>>;
}

export interface HostingInspectionInput extends ProviderRequestContext {
  readonly provider: 'vercel' | 'render';
  readonly serviceReference: string;
  readonly expectedEnvironment: ProviderEnvironment;
}
export interface HostingConfigurationObservation {
  readonly serviceReference: string;
  readonly environment: ProviderEnvironment;
  readonly deploymentReference?: string;
  readonly configurationState: 'matches' | 'mismatch' | 'unavailable' | 'disabled' | 'unknown';
  readonly capability: ProviderCapability;
}
export interface HostingConfigurationProviderPort {
  inspectConfiguration(input: HostingInspectionInput, signal?: AbortSignal): Promise<ProviderCallResult<HostingConfigurationObservation>>;
}
export interface DnsRecordIntent {
  readonly recordType: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'CAA';
  readonly nameReference: string;
  readonly targetReference: string;
  readonly proxied: boolean;
}
export interface DnsConfigurationProviderPort {
  validateIntent(input: ProviderRequestContext & { readonly provider: 'cloudflare'; readonly zoneReference: string; readonly intent: DnsRecordIntent }, signal?: AbortSignal): Promise<ProviderCallResult<{ readonly valid: boolean; readonly capability: ProviderCapability }>>;
}

export interface DeferredProviderPort {
  getCapability(input: ProviderRequestContext & { readonly capability: 'sms' | 'maps' | 'covenant-identity' | 'cu-express' }, signal?: AbortSignal): Promise<ProviderCallResult<ProviderCapability>>;
}

export interface NomaProviderPorts {
  readonly payment: PaymentProviderPort;
  readonly paymentWebhook: ProviderWebhookVerifierPort & ProviderEventMapperPort;
  readonly refund: RefundProviderPort;
  readonly bankAccount: BankAccountProviderPort;
  readonly beneficiary: BeneficiaryProviderPort;
  readonly transfer: TransferProviderPort;
  readonly storage: ObjectStorageProviderPort;
  readonly email: TransactionalEmailProviderPort;
  readonly push: WebPushProviderPort;
  readonly monitoring: MonitoringProviderPort;
  readonly analytics: AnalyticsProviderPort;
  readonly telemetry: OperationalTelemetryProviderPort;
  readonly hosting: HostingConfigurationProviderPort;
  readonly dns: DnsConfigurationProviderPort;
  readonly deferred: DeferredProviderPort;
}
