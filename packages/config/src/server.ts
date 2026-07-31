export interface ServerRuntimeConfig {
  readonly applicationEnvironment: 'development' | 'test' | 'preview' | 'staging' | 'production';
  readonly secretSource: 'environment';
}

export const serverConfigBoundary = 'server-only' as const;
