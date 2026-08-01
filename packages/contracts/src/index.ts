export const contractsPackage = { name: '@noma/contracts', boundary: 'shared' } as const;
export type ContractsPackage = typeof contractsPackage;
export * from './health.js';
export * from './queue.js';
