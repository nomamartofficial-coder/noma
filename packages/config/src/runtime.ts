export type RuntimeName = 'web' | 'api' | 'worker';

const DEFAULT_PORTS: Readonly<Record<RuntimeName, number>> = {
  web: 3000,
  api: 3001,
  worker: 3002,
};

export interface RuntimeAddress {
  readonly host: string;
  readonly port: number;
}

export function resolveRuntimeAddress(
  runtime: RuntimeName,
  environment: Readonly<Record<string, string | undefined>>,
): RuntimeAddress {
  const scopedPort = environment[`${runtime.toUpperCase()}_PORT`];
  const parsed = Number(scopedPort ?? environment.PORT ?? DEFAULT_PORTS[runtime]);
  const port = Number.isInteger(parsed) && parsed > 0 && parsed < 65_536
    ? parsed
    : DEFAULT_PORTS[runtime];

  return {
    host: environment.HOST ?? '0.0.0.0',
    port,
  };
}
