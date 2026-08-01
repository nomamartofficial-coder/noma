export const platformPackage = { name: '@noma/platform', boundary: 'server' } as const;
export type PlatformPackage = typeof platformPackage;
export * from './providers/index.js';
