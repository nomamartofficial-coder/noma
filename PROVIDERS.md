# Provider ports foundation

> **Task:** `DEV-007`
> **Risk:** `P0-FINANCIAL`
> **Status:** contracts and local simulators only; no provider is active

## Authority and dependency direction

`@noma/platform/providers` owns provider-neutral application contracts. `@noma/integrations/testing` implements deterministic local simulators. `@noma/testing/providers` composes those simulators with the DEV-006 manual clock, deterministic identifiers, scripted outcomes, and manual scheduler.

```text
application/domain -> @noma/platform/providers <- @noma/integrations/testing
                                                   ^
                                                   |
                                          @noma/testing/providers
```

Web cannot import either server provider ports or integrations. Production source cannot import the simulator inspection entry point. No vendor SDK request, response, error, status, or configuration object crosses a port.

## Common contract

Every material call carries a stable operation ID, idempotency key, correlation ID, attempt, explicit provider environment, and deadline. Money is a positive safe integer in minor units with an explicit three-letter currency. The shared result vocabulary is:

- `accepted`: work was accepted, but its external effect is not final;
- `final_success`: the provider operation or retrieval completed successfully and returned provider-neutral data;
- `final_failure`: a conclusive failure with explicit retryability;
- `uncertain`: Noma cannot prove whether the external effect occurred;
- `rejected`: the request was not accepted and exposes only a safe message.

A successful retrieval may return data whose business observation is `reversed` or `unknown`; `final_success` describes the retrieval call, not a money state. Unknown provider statuses require reconciliation. A timeout after possible acceptance is uncertain and must never create a blind second money operation with a new identity.

Configuration contains references and policy only: provider/environment/mode, optional base URL and account/region references, secret references, timeout/deadline/attempt policies, classifications, owner, runbook, and status-page reference. It never contains credential values.

## Port families

| Family | Neutral responsibilities | Deferred owning work |
|---|---|---|
| Payment + webhook | initialise, retrieve, verify authenticity, map append-only event observations | PAY-001–PAY-003 |
| Refund | full/partial submission and retrieval with accepted/processing/final/uncertain separation | REF-001–REF-002 |
| Bank/beneficiary/transfer | resolve minimum account data, create beneficiary, initiate/OTP/finalise/retrieve/reverse | PYO-001–PYO-004 |
| Object storage | short-lived upload/read operations, HEAD-like inspection, quarantine, test-only delete | FIL-001–FIL-002 |
| Transactional email | submission, delivery-event mapping, suppression lookup | IAM-003, NTF-001 |
| Web Push | progressive opt-in delivery boundary | NTF-001 and later activation |
| Monitoring | safe diagnostic capture and bounded flush | DEV-010 / OBS-001 |
| Analytics | schema-versioned, privacy-minimised capture and flush | OBS-002 |
| Operational telemetry | counters, gauges, histograms, spans, events, and flush | DEV-010 |
| Hosting/DNS | read-only configuration inspection and DNS-intent validation | DEV-009 / INF tasks |
| Deferred/manual | truthful SMS, maps, Covenant identity, and CU Express capability state | separate approved tasks |

Ports do not create Payment, Refund, Payout, File, Notification, provider-attempt, event, reconciliation, ledger, order, inventory, or custody records. Provider work still belongs after an authoritative transaction/outbox commit.

## Environment selection

`NOMA_PROVIDER_MODE` accepts `disabled`, `simulator`, or `real`.

- Default is `disabled` in every environment.
- Local/test/preview/staging may select `simulator` explicitly; this merge does not wire a runtime to it.
- Production rejects `simulator`.
- `real` fails closed because DEV-007 intentionally implements no real adapter.
- Provider credentials remain optional and no new public Web variable exists.

## Security, privacy, and financial controls

- Simulator inspection records safe references, masked account suffixes, amounts/currency, outcome kinds, and sequence only.
- Raw account numbers, webhook signatures/bodies, recipient addresses, message bodies, provider payloads, authorization values, credential URLs, private keys, and secrets are excluded.
- Monitoring, analytics, push, and operational telemetry reject unsafe keys/values before recording.
- Storage returns opaque short-lived capability references, never a permanent public URL.
- Email provider acceptance is `SUBMITTED`, not delivered/read.
- Transfer provider success is not proof the beneficiary has personally observed bank credit.
- Provider callbacks are observations requiring verification and guarded application commands, not business truth.

## External semantic references

The neutral semantics were checked against official primary documentation without adopting provider objects:

- Paystack [transaction initialise/verify](https://paystack.com/docs/api/transaction/), [payment verification statuses](https://paystack.com/docs/payments/verify-payments/), [webhook verification](https://paystack.com/docs/payments/webhooks/), [refunds](https://paystack.com/docs/payments/refunds/), [account verification](https://paystack.com/docs/identity-verification/verify-account-number/), and [transfers](https://paystack.com/docs/transfers/how-transfers-work/).
- Postmark [email submission](https://postmarkapp.com/developer/api/email-api) and [delivery/bounce/complaint/suppression webhooks](https://postmarkapp.com/developer/webhooks/webhooks-overview).
- Amazon S3 [presigned uploads](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html) and [presigned URL capabilities](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).
- W3C [Push API](https://www.w3.org/TR/push-api/) for service-worker delivery semantics.
- Grafana [OTLP ingestion](https://grafana.com/docs/grafana-cloud/send-data/otlp/send-opentelemetry-data/), Vercel [REST API](https://vercel.com/docs/rest-api), Render [API](https://render.com/docs/api), and Cloudflare [API conventions](https://developers.cloudflare.com/api/).

These sources inform adapter boundaries only. The Build Pack remains authoritative.

## Commands and rollback

```bash
pnpm providers:validate
pnpm providers:self-test
pnpm providers:test
pnpm providers:verify
```

Rollback reverts contracts, simulators, tests, validation, configuration references, and documentation. There is no migration, external state, provider call, live credential, deployment, DNS change, message, object, telemetry export, or money movement to reverse.
