import { createLocalProviderSimulators } from '@noma/integrations/testing';
import type {
  ProviderSimulatorOperation,
  ProviderSimulatorScenario,
  ProviderSimulatorSnapshot,
} from '@noma/integrations/testing';
import {
  parseProviderCallResult,
  type NomaProviderPorts,
  type ProviderCallResult,
  type ProviderEnvironment,
  type ProviderOperationIdentity,
  type ProviderRequestContext,
} from '@noma/platform/providers';

import { ManualTestClock, type TestInstant } from './clock.js';
import { ScriptedOutcomeController } from './outcomes.js';
import { DeterministicTestIds, type TestSeed } from './random.js';
import { createManualTestScheduler } from './scheduler.js';

export interface ProviderSimulatorHarness {
  readonly ports: NomaProviderPorts;
  readonly clock: ManualTestClock;
  readonly ids: DeterministicTestIds;
  context(prefix?: string, environment?: ProviderEnvironment, deadlineMilliseconds?: number): ProviderRequestContext;
  snapshot(): ProviderSimulatorSnapshot;
  reset(): void;
  toJSON(): Readonly<{ kind: 'noma-provider-simulator'; callCount: number; eventCount: number }>;
}

export interface CreateProviderSimulatorHarnessOptions {
  readonly seed?: TestSeed;
  readonly now?: TestInstant;
  readonly scripts: Readonly<Partial<Record<ProviderSimulatorOperation, readonly ProviderSimulatorScenario[]>>>;
}

export function createProviderSimulatorHarness(options: CreateProviderSimulatorHarnessOptions): ProviderSimulatorHarness {
  const seed = options.seed ?? 7007;
  const clock = new ManualTestClock(options.now);
  const ids = new DeterministicTestIds(seed);
  const sources: Partial<Record<ProviderSimulatorOperation, ScriptedOutcomeController<ProviderSimulatorScenario>>> = {};
  for (const [operation, scenarios] of Object.entries(options.scripts) as Array<[ProviderSimulatorOperation, readonly ProviderSimulatorScenario[]]>) {
    sources[operation] = new ScriptedOutcomeController(scenarios.map((value) => ({ kind: 'resolve', value })));
  }
  const simulator = createLocalProviderSimulators({
    clock,
    scheduler: createManualTestScheduler(clock),
    scripts: sources,
  });
  let sequence = 0;
  return Object.freeze({
    ports: simulator.ports,
    clock,
    ids,
    context(prefix = 'OP', environment: ProviderEnvironment = 'test', deadlineMilliseconds = 30_000): ProviderRequestContext {
      sequence += 1;
      const identity: ProviderOperationIdentity = Object.freeze({
        operationId: ids.nextPublicReference(prefix, 12),
        idempotencyKey: ids.nextPublicReference('IDEM', 14),
        correlationId: ids.nextUuid(),
        attempt: 1,
        deadlineAt: new Date(clock.now().getTime() + deadlineMilliseconds).toISOString(),
      });
      return Object.freeze({ identity, environment });
    },
    snapshot: () => simulator.inspector.snapshot(),
    reset: () => {
      sequence = 0;
      simulator.inspector.reset();
    },
    toJSON: () => simulator.inspector.toJSON(),
  });
}

export interface ProviderConformanceCase {
  readonly name: string;
  readonly expectedKind: ProviderCallResult<unknown>['kind'];
  readonly invoke: () => Promise<unknown>;
}

export interface ProviderConformanceEvidence {
  readonly family: string;
  readonly cases: readonly Readonly<{ name: string; resultKind: string }>[];
}

export async function verifyProviderConformance(
  family: string,
  cases: readonly ProviderConformanceCase[],
): Promise<ProviderConformanceEvidence> {
  if (!/^[a-z][a-z0-9-]{1,79}$/.test(family)) throw new Error('provider conformance family is invalid');
  if (cases.length === 0) throw new Error('provider conformance requires at least one case');
  const evidence: Array<Readonly<{ name: string; resultKind: string }>> = [];
  for (const testCase of cases) {
    const result = parseProviderCallResult(testCase.invoke ? await testCase.invoke() : undefined, (value) => value);
    if (result.kind !== testCase.expectedKind) {
      throw new Error(`${family}/${testCase.name}: expected ${testCase.expectedKind}, received ${result.kind}`);
    }
    evidence.push(Object.freeze({ name: testCase.name, resultKind: result.kind }));
  }
  return Object.freeze({ family, cases: Object.freeze(evidence) });
}
