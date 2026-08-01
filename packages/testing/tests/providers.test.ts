import { describe, expect, it } from 'vitest';

import type { ProviderSimulatorScenario } from '@noma/integrations/testing';
import { createProviderSimulatorHarness, verifyProviderConformance } from '../src/providers.js';

const accepted = (reference: string, data: unknown, extra: Omit<ProviderSimulatorScenario, 'result'> = {}): ProviderSimulatorScenario => ({ result: { kind: 'accepted', providerReference: reference, data }, ...extra });
const success = (reference: string, data: unknown, extra: Omit<ProviderSimulatorScenario, 'result'> = {}): ProviderSimulatorScenario => ({ result: { kind: 'final_success', providerReference: reference, data }, ...extra });
const rejected = (code: string): ProviderSimulatorScenario => ({ result: { kind: 'rejected', code, safeMessage: 'synthetic provider rejection' } });

function money() { return Object.freeze({ amountMinor: 125_000, currency: 'NGN' }); }

describe('deterministic provider simulators', () => {
  it('distinguishes payment acceptance, verified success, duplicates, events, reversal, and unknown state', async () => {
    const harness = createProviderSimulatorHarness({
      seed: 7007,
      scripts: {
        'payment.initialise': [accepted('sim-pay-001', { status: 'initialised', checkoutAccessReference: 'checkout-access-001' })],
        'payment.retrieve': [
          success('sim-pay-001', { status: 'successful', observedMoney: money(), observedEnvironment: 'test', reconciliation: 'none' }),
          success('sim-pay-002', { status: 'reversed', observedMoney: money(), observedEnvironment: 'test', reconciliation: 'required' }),
          success('sim-pay-003', { status: 'unknown', observedEnvironment: 'test', reconciliation: 'required' }),
        ],
        'payment-event.verify': [success('sim-event-verification-001', { authentic: true, signatureVersion: 'sim-v1', payloadHash: 'hash-001' })],
        'payment-event.map': [
          success('sim-event-002', { identity: { eventId: 'event-002', eventType: 'payment-observed', occurredAt: '2026-08-01T00:00:02.000Z', receivedAt: '2026-08-01T00:00:03.000Z', payloadHash: 'hash-002' }, status: 'successful', reconciliation: 'none' }, { event: { eventId: 'event-002', status: 'successful', sequence: 2 } }),
          success('sim-event-001', { identity: { eventId: 'event-001', eventType: 'payment-observed', occurredAt: '2026-08-01T00:00:01.000Z', receivedAt: '2026-08-01T00:00:04.000Z', payloadHash: 'hash-001' }, status: 'pending', reconciliation: 'none' }, { event: { eventId: 'event-001', status: 'pending', sequence: 1 } }),
        ],
      },
    });
    const initialContext = harness.context('PAY');
    const initialInput = { ...initialContext, internalReference: 'payment-internal-001', expectedMoney: money(), payerContactReference: 'buyer-contact-001', callbackUrlReference: 'callback-route-001', metadata: { checkout: 'checkout-001' } };
    const first = await harness.ports.payment.initialisePayment(initialInput);
    const duplicate = await harness.ports.payment.initialisePayment(initialInput);
    expect(first.kind).toBe('accepted');
    expect(duplicate).toEqual(first);
    expect(harness.snapshot().calls.at(-1)?.duplicate).toBe(true);

    const verified = await harness.ports.payment.retrievePayment({ ...harness.context('PAY'), internalReference: 'payment-internal-001', expectedMoney: money() });
    const reversed = await harness.ports.payment.retrievePayment({ ...harness.context('PAY'), internalReference: 'payment-internal-002', expectedMoney: money() });
    const unknown = await harness.ports.payment.retrievePayment({ ...harness.context('PAY'), internalReference: 'payment-internal-003', expectedMoney: money() });
    expect(verified.kind).toBe('final_success');
    expect(reversed.kind === 'final_success' && reversed.data.status).toBe('reversed');
    expect(unknown.kind === 'final_success' && unknown.data.reconciliation).toBe('required');

    const rawBody = new TextEncoder().encode('{"synthetic":true}');
    expect((await harness.ports.paymentWebhook.verifyEvent({ ...harness.context('EVT'), eventReference: 'event-reference-001', rawBody, signature: 'test-signature-value', receivedAt: harness.clock.instant() })).kind).toBe('final_success');
    await harness.ports.paymentWebhook.mapEvent({ ...harness.context('EVT'), eventReference: 'event-reference-002', rawBody, signature: 'test-signature-value', receivedAt: harness.clock.instant() });
    await harness.ports.paymentWebhook.mapEvent({ ...harness.context('EVT'), eventReference: 'event-reference-001', rawBody, signature: 'test-signature-value', receivedAt: harness.clock.instant() });
    expect(harness.snapshot().events.map((event) => event.sequence)).toEqual([2, 1]);
  });

  it('models timeout before and after possible money-operation acceptance deterministically', async () => {
    const harness = createProviderSimulatorHarness({ scripts: {
      'transfer.initiate': [
        success('sim-transfer-001', { status: 'queued', money: money(), beneficiaryReference: 'beneficiary-001', reconciliation: 'none', bankCreditVisibility: 'not-evidenced' }, { latencyMilliseconds: 1_000, acceptance: 'not-sent' }),
        success('sim-transfer-002', { status: 'queued', money: money(), beneficiaryReference: 'beneficiary-001', reconciliation: 'none', bankCreditVisibility: 'not-evidenced' }, { latencyMilliseconds: 1_000, acceptance: 'possibly-accepted' }),
      ],
    } });
    const before = await harness.ports.transfer.initiateTransfer({ ...harness.context('TRF', 'test', 500), internalReference: 'transfer-001', beneficiaryReference: 'beneficiary-001', money: money() });
    const after = await harness.ports.transfer.initiateTransfer({ ...harness.context('TRF', 'test', 500), internalReference: 'transfer-002', beneficiaryReference: 'beneficiary-001', money: money() });
    expect(before).toMatchObject({ kind: 'rejected', code: 'DEADLINE_EXPIRED_BEFORE_ACCEPTANCE' });
    expect(after).toMatchObject({ kind: 'uncertain', code: 'DEADLINE_EXPIRED_AFTER_POSSIBLE_ACCEPTANCE' });
  });

  it('covers refund, account, beneficiary, transfer, storage, email, push, diagnostics, analytics, telemetry, hosting, DNS, and deferred ports', async () => {
    const capability = { provider: 'disabled-local', capability: 'sms', state: 'manual-required', environment: 'test', checkedAt: '2026-08-01T00:00:00.000Z', safeReason: 'no approved provider' };
    const scripts: CreateProviderSimulatorHarnessOptions['scripts'] = {
      'refund.submit': [accepted('sim-refund-001', { status: 'processing', money: money(), reconciliation: 'none' })],
      'refund.retrieve': [success('sim-refund-001', { status: 'successful', money: money(), reconciliation: 'none' })],
      'bank.list': [success('sim-bank-list-001', [{ bankCode: 'TEST001', displayName: 'Synthetic Bank', country: 'NG', currency: 'NGN' }])],
      'bank.resolve': [success('sim-account-001', { bankCode: 'TEST001', maskedAccount: '******6789', accountName: 'Synthetic Seller', match: 'resolved' })],
      'beneficiary.create': [success('sim-beneficiary-001', { beneficiaryReference: 'beneficiary-001', status: 'created' })],
      'transfer.initiate': [accepted('sim-transfer-001', { status: 'otp-required', money: money(), beneficiaryReference: 'beneficiary-001', reconciliation: 'none', bankCreditVisibility: 'not-evidenced' })],
      'transfer.finalise': [accepted('sim-transfer-001', { status: 'queued', money: money(), beneficiaryReference: 'beneficiary-001', reconciliation: 'none', bankCreditVisibility: 'not-evidenced' })],
      'transfer.retrieve': [success('sim-transfer-001', { status: 'successful', money: money(), beneficiaryReference: 'beneficiary-001', reconciliation: 'none', bankCreditVisibility: 'provider-confirmed-attempt' })],
      'storage.create-upload': [accepted('sim-upload-001', { operationReference: 'upload-001', objectReference: 'object-001', method: 'PUT', expiresAt: '2026-08-01T00:05:00.000Z', bearerAccessReference: 'test-upload-capability-001' })],
      'storage.inspect': [success('sim-object-001', { objectReference: 'object-001', state: 'present', contentType: 'image/png', sizeBytes: 1024, checksumReference: 'checksum-001' })],
      'storage.create-read': [success('sim-read-001', { operationReference: 'read-001', objectReference: 'object-001', method: 'GET', expiresAt: '2026-08-01T00:05:00.000Z', bearerAccessReference: 'test-read-capability-001' })],
      'email.send': [accepted('sim-message-001', { status: 'accepted', messageIdentity: 'message-001' })],
      'push.send': [accepted('sim-push-001', { status: 'accepted' })],
      'monitoring.capture-message': [accepted('sim-monitoring-001', { captured: true })],
      'analytics.capture': [accepted('sim-analytics-001', { disposition: 'accepted' })],
      'telemetry.record': [accepted('sim-telemetry-001', { recorded: true })],
      'hosting.inspect': [success('sim-hosting-001', { serviceReference: 'service-001', environment: 'test', configurationState: 'matches', capability: { ...capability, provider: 'render', capability: 'configuration-inspection', state: 'available' } })],
      'dns.validate-intent': [success('sim-dns-001', { valid: true, capability: { ...capability, provider: 'cloudflare', capability: 'dns-intent-validation', state: 'available' } })],
      'deferred.capability': [success('sim-disabled-001', capability)],
    };
    const harness = createProviderSimulatorHarness({ scripts });
    const ctx = () => harness.context('PORT');
    const cases = [
      { name: 'refund accepted', expectedKind: 'accepted' as const, invoke: () => harness.ports.refund.submitRefund({ ...ctx(), internalReference: 'refund-001', originalPaymentReference: 'payment-001', money: money() }) },
      { name: 'refund final', expectedKind: 'final_success' as const, invoke: () => harness.ports.refund.retrieveRefund({ ...ctx(), providerRefundReference: 'sim-refund-001' }) },
      { name: 'bank list', expectedKind: 'final_success' as const, invoke: () => harness.ports.bankAccount.listBanks({ ...ctx(), country: 'NG', currency: 'NGN' }) },
      { name: 'account resolution', expectedKind: 'final_success' as const, invoke: () => harness.ports.bankAccount.resolveAccount({ ...ctx(), bankCode: 'TEST001', accountNumber: '0123456789' }) },
      { name: 'beneficiary', expectedKind: 'final_success' as const, invoke: () => harness.ports.beneficiary.createBeneficiary({ ...ctx(), internalAccountReference: 'account-001', bankCode: 'TEST001', accountNumber: '0123456789', accountName: 'Synthetic Seller' }) },
      { name: 'transfer otp', expectedKind: 'accepted' as const, invoke: () => harness.ports.transfer.initiateTransfer({ ...ctx(), internalReference: 'transfer-001', beneficiaryReference: 'beneficiary-001', money: money() }) },
      { name: 'transfer queued', expectedKind: 'accepted' as const, invoke: () => harness.ports.transfer.finaliseTransfer({ ...ctx(), providerReference: 'sim-transfer-001', authorizationReference: 'test-authorization-001' }) },
      { name: 'transfer final', expectedKind: 'final_success' as const, invoke: () => harness.ports.transfer.retrieveTransfer({ ...ctx(), internalReference: 'transfer-001', providerReference: 'sim-transfer-001' }) },
      { name: 'storage upload', expectedKind: 'accepted' as const, invoke: () => harness.ports.storage.createUploadOperation({ ...ctx(), objectKey: 'test/private/object-001', method: 'PUT', contentType: 'image/png', maximumBytes: 2048, expiresAt: '2026-08-01T00:05:00.000Z', classification: 'sensitive' }) },
      { name: 'storage head', expectedKind: 'final_success' as const, invoke: () => harness.ports.storage.inspectObject({ ...ctx(), objectReference: 'object-001' }) },
      { name: 'storage read', expectedKind: 'final_success' as const, invoke: () => harness.ports.storage.createReadOperation({ ...ctx(), objectReference: 'object-001', expiresAt: '2026-08-01T00:05:00.000Z' }) },
      { name: 'email accepted', expectedKind: 'accepted' as const, invoke: () => harness.ports.email.sendEmail({ ...ctx(), messageIdentity: 'message-001', templateKey: 'security-notice', templateVersion: 'version-001', recipientReference: 'recipient-001', locale: 'en-NG', variables: { safeReference: 'notice-001' }, metadata: { category: 'security' } }) },
      { name: 'push accepted', expectedKind: 'accepted' as const, invoke: () => harness.ports.push.sendPush({ ...ctx(), notificationIdentity: 'notification-001', subscriptionReference: 'subscription-001', category: 'order-update', safePayload: { routeReference: 'order-status' } }) },
      { name: 'monitoring accepted', expectedKind: 'accepted' as const, invoke: () => harness.ports.monitoring.captureMessage({ ...ctx(), safeMessage: 'synthetic diagnostic', level: 'info', context: { correlationId: 'correlation-safe-001', tags: { service: 'worker' } } }) },
      { name: 'analytics accepted', expectedKind: 'accepted' as const, invoke: () => harness.ports.analytics.captureEvent({ ...ctx(), event: { eventName: 'checkout_started', schemaVersion: 1, occurredAt: harness.clock.instant(), environment: 'test', correlationId: 'correlation-safe-001', properties: { synthetic: true } } }) },
      { name: 'telemetry accepted', expectedKind: 'accepted' as const, invoke: () => harness.ports.telemetry.record({ ...ctx(), telemetry: { kind: 'counter', name: 'noma.provider.calls', value: 1, attributes: { provider: 'simulator' } } }) },
      { name: 'hosting inspection', expectedKind: 'final_success' as const, invoke: () => harness.ports.hosting.inspectConfiguration({ ...ctx(), provider: 'render', serviceReference: 'service-001', expectedEnvironment: 'test' }) },
      { name: 'dns intent', expectedKind: 'final_success' as const, invoke: () => harness.ports.dns.validateIntent({ ...ctx(), provider: 'cloudflare', zoneReference: 'zone-001', intent: { recordType: 'CNAME', nameReference: 'api-test', targetReference: 'service-test', proxied: false } }) },
      { name: 'deferred manual', expectedKind: 'final_success' as const, invoke: () => harness.ports.deferred.getCapability({ ...ctx(), capability: 'sms' }) },
    ];
    const evidence = await verifyProviderConformance('provider-foundation', cases);
    expect(evidence.cases).toHaveLength(cases.length);
    expect(JSON.stringify(harness)).not.toContain('0123456789');
    expect(JSON.stringify(harness.snapshot())).not.toContain('0123456789');
    expect(JSON.stringify(harness.snapshot())).not.toMatch(/https?:\/\//);
  });

  it('rejects unsafe monitoring/analytics values and resets only isolated state', async () => {
    const first = createProviderSimulatorHarness({ scripts: { 'analytics.capture': [rejected('UNSAFE_DATA')] } });
    const second = createProviderSimulatorHarness({ scripts: { 'analytics.capture': [rejected('UNSAFE_DATA')] } });
    const unsafe = { ...first.context('ANL'), event: { eventName: 'unsafe_event', schemaVersion: 1, occurredAt: first.clock.instant(), environment: 'test' as const, correlationId: 'correlation-safe-001', properties: { authorization: 'Bearer secret-value' } } };
    expect(() => first.ports.analytics.captureEvent(unsafe)).toThrow(/prohibited/);
    expect(first.snapshot().calls).toHaveLength(0);
    await second.ports.analytics.captureEvent({ ...second.context('ANL'), event: { ...unsafe.event, properties: { synthetic: true } } });
    expect(second.snapshot().calls).toHaveLength(1);
    second.reset();
    expect(second.snapshot().calls).toHaveLength(0);
    expect(first.snapshot().calls).toHaveLength(0);
  });

  it('reproduces references and snapshots for the same seed', async () => {
    const plan = { 'payment.initialise': [accepted('sim-pay-001', { status: 'initialised', checkoutAccessReference: 'checkout-access-001' })] } as const;
    const invoke = async () => {
      const harness = createProviderSimulatorHarness({ seed: 77, scripts: plan });
      const input = { ...harness.context('PAY'), internalReference: 'payment-001', expectedMoney: money(), payerContactReference: 'contact-001', callbackUrlReference: 'callback-001', metadata: {} };
      await harness.ports.payment.initialisePayment(input);
      return harness.snapshot();
    };
    expect(await invoke()).toEqual(await invoke());
  });
});

type CreateProviderSimulatorHarnessOptions = Parameters<typeof createProviderSimulatorHarness>[0];
