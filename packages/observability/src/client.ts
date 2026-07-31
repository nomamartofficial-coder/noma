export interface ClientTelemetryEvent { readonly name: string; readonly occurredAt: string; }
export const clientObservabilityBoundary = 'browser-safe' as const;
