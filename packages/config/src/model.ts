export const APPLICATION_ENVIRONMENTS = [
  'development',
  'test',
  'preview',
  'staging',
  'production',
] as const;

export type ApplicationEnvironment = (typeof APPLICATION_ENVIRONMENTS)[number];
export const PROVIDER_ADAPTER_MODES = ['disabled', 'simulator', 'real'] as const;
export type ProviderAdapterMode = (typeof PROVIDER_ADAPTER_MODES)[number];
export type RuntimeName = 'web' | 'api' | 'worker';
export type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export interface RuntimeAddress {
  readonly host: string;
  readonly port: number;
}

export interface EnvironmentValidationIssue {
  readonly key: string;
  readonly code:
    | 'missing'
    | 'invalid'
    | 'insecure'
    | 'environment-mismatch'
    | 'unexpected-public-variable'
    | 'placeholder-secret';
  readonly message: string;
}
