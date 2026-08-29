export const platformPackage = { name: '@noma/platform', boundary: 'server' } as const;
export type PlatformPackage = typeof platformPackage;
export * from './identity/index.js';
export * from './providers/index.js';
