export interface ServerTelemetryEvent { readonly name: string; readonly correlationId: string; }
export const serverObservabilityBoundary = 'server-only' as const;
