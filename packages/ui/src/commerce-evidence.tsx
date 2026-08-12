import type { HTMLAttributes, ReactNode } from 'react';
import { formatMaterialTimestamp } from './commerce-time.js';
import { StatusChip } from './commerce-status.js';
import type { StatusTone } from './tokens.js';

export interface EvidenceCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  readonly typeLabel: string;
  readonly title: string;
  readonly summary?: ReactNode;
  readonly recordedByLabel: string;
  readonly recordedAt: string;
  readonly statusLabel: string;
  readonly statusTone: StatusTone;
  readonly reference?: string;
  readonly action?: ReactNode;
  readonly locale?: string;
  readonly timeZone?: string;
}

export function EvidenceCard({ action, className, locale, recordedAt, recordedByLabel, reference, statusLabel, statusTone, summary, timeZone, title, typeLabel, ...props }: EvidenceCardProps) {
  return (
    <article {...props} className={['noma-evidence-card', className].filter(Boolean).join(' ')}>
      <header className="noma-evidence-card-header">
        <div><span className="noma-evidence-type">{typeLabel}</span><h3>{title}</h3></div>
        <StatusChip tone={statusTone}>{statusLabel}</StatusChip>
      </header>
      {summary && <div className="noma-evidence-summary">{summary}</div>}
      <dl className="noma-evidence-metadata">
        <div><dt>Recorded by</dt><dd>{recordedByLabel}</dd></div>
        <div><dt>Recorded at</dt><dd><time dateTime={recordedAt}>{formatMaterialTimestamp(recordedAt, { locale, timeZone })}</time></dd></div>
        {reference && <div><dt>Reference</dt><dd>{reference}</dd></div>}
      </dl>
      {action && <div className="noma-evidence-action">{action}</div>}
    </article>
  );
}
