# Deterministic local provider simulators

> The simulator is test infrastructure, not a sandbox account or production adapter.

## Composition

`createProviderSimulatorHarness` creates one isolated set of ports. It uses:

- `ManualTestClock` for exact instants and deadline boundaries;
- `DeterministicTestIds` for stable operation/correlation/reference fixtures;
- resettable `ScriptedOutcomeController` instances for ordered outcomes; and
- `createManualTestScheduler` to advance the injected clock without wall-clock sleeps.

The integrations package depends only on structural clock/scheduler/outcome-source interfaces, so production code does not depend on `@noma/testing`. Test code composes the structural interfaces through `@noma/testing/providers`.

## Scenario model

Each operation has an ordered script. A scenario contains a runtime-validated neutral result, optional deterministic latency, acceptance phase (`not-sent`, `possibly-accepted`, or `accepted`), and optional safe event metadata.

- A deadline/abort before sending becomes `rejected`.
- A deadline/abort after possible acceptance becomes `uncertain`.
- A repeated operation ID replays the first logical result without consuming another scenario.
- Event scripts may emit duplicate references, reverse/correct earlier events, and deliberately use out-of-order sequence numbers.
- Missing scripts fail as unsupported work; exhausted scripts fail deterministically.

The scenario matrix covers payment/refund/transfer acceptance and finality, payment reversal/unknown status, webhook signature validity and replay, account resolution/mismatch, OTP/queued/failed/reversed transfer observations, storage expiry/type/size/presence/quarantine, email acceptance/delivery/bounce/complaint/suppression, push disabled/gone/unknown, monitoring/analytics/telemetry availability and unsafe data, hosting/DNS inspection, and truthful disabled/manual providers.

## Inspection and isolation

Inspection is available only from test entry points. Immutable snapshots contain:

- operation, operation/correlation reference, environment, deterministic timestamps;
- duplicate marker and result kind;
- optional provider reference;
- explicitly constructed safe summaries; and
- safe event identity/status/sequence/correction links.

They never contain raw request objects, webhook bytes/signatures, credentials, account numbers, recipient addresses, message bodies, object capability URLs, or private payloads. Ordinary JSON serialization returns counts only.

`reset()` clears calls, events, replay state, sequence counters, and resets scripted controllers for that simulator only. Prefer a new harness per test. Concurrent tests must never share a harness.

## Conformance

`verifyProviderConformance` accepts provider-family cases and validates the same neutral result envelope future real adapters must return. Current suites prove result validation, stable identities, accepted-versus-final distinction, deterministic uncertainty, duplicate replay, out-of-order/reversal/unknown observations, safe serialization, reset isolation, and all required port-family calls.

Use the exact failing seed printed by Vitest to reproduce failures. Do not add retries, `Math.random()`, `Date.now()`, arbitrary sleeps, production endpoints, real recipients, real bank details, or provider credentials.
