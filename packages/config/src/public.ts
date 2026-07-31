export interface PublicRuntimeConfig {
  readonly applicationEnvironment: 'development' | 'test' | 'preview' | 'staging' | 'production';
}

export const publicConfigBoundary = 'browser-safe' as const;
