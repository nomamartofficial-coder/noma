export type RuntimeName = 'web' | 'api' | 'worker';
export type HealthCheck = 'liveness' | 'readiness';
export type DependencyHealth = 'ready' | 'not-configured' | 'unavailable';

export interface RuntimeHealthResponse {
  readonly runtime: RuntimeName;
  readonly check: HealthCheck;
  readonly status: 'ok' | 'not-ready';
  readonly checkedAt: string;
  readonly dependencies: Readonly<Record<string, DependencyHealth>>;
}

export function createHealthResponse(input: {
  readonly runtime: RuntimeName;
  readonly check: HealthCheck;
  readonly ready: boolean;
  readonly dependencies?: Readonly<Record<string, DependencyHealth>>;
}): RuntimeHealthResponse {
  return {
    runtime: input.runtime,
    check: input.check,
    status: input.ready ? 'ok' : 'not-ready',
    checkedAt: new Date().toISOString(),
    dependencies: input.dependencies ?? {},
  };
}
