export type DateTimeFormat = 'compact' | 'detailed';

export interface MaterialTimeOptions {
  readonly locale?: string | undefined;
  readonly timeZone?: string | undefined;
  readonly format?: DateTimeFormat | undefined;
}

const RFC3339_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function assertMaterialTimestamp(value: string): Date {
  if (!RFC3339_INSTANT.test(value)) {
    throw new TypeError('Material timestamps must be RFC 3339 instants with Z or an explicit offset');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new TypeError('Material timestamp is not a valid instant');
  return parsed;
}

export function formatMaterialTimestamp(value: string, options: MaterialTimeOptions = {}): string {
  const instant = assertMaterialTimestamp(value);
  const locale = options.locale ?? 'en-NG';
  const timeZone = options.timeZone ?? 'Africa/Lagos';
  if (options.format === 'compact') {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone,
    }).format(instant);
  }
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
    timeZoneName: 'short',
  }).format(instant);
}
