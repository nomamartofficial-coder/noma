import type { HTMLAttributes, ReactNode } from 'react';
import { formatMaterialTimestamp } from './commerce-time.js';
import { StatusChip } from './commerce-status.js';
import type { StatusTone } from './tokens.js';

export type TimelineActor = 'buyer' | 'seller' | 'rider' | 'staff' | 'system' | 'provider';
export type TimelineEventState = 'pending' | 'confirmed' | 'failed' | 'superseded';

const ACTOR_LABELS: Readonly<Record<TimelineActor, string>> = Object.freeze({
  buyer: 'Buyer', seller: 'Seller', rider: 'Rider', staff: 'Staff', system: 'System', provider: 'Provider',
});
const STATE_TONES: Readonly<Record<TimelineEventState, StatusTone>> = Object.freeze({
  pending: 'processing', confirmed: 'success', failed: 'danger', superseded: 'info',
});

export interface TimelineProps extends Omit<HTMLAttributes<HTMLOListElement>, 'children'> {
  readonly label: string;
  readonly children: ReactNode;
}

export function Timeline({ children, className, label, ...props }: TimelineProps) {
  return <ol {...props} aria-label={label} className={['noma-timeline', className].filter(Boolean).join(' ')}>{children}</ol>;
}

export interface TimelineItemProps extends Omit<HTMLAttributes<HTMLLIElement>, 'children'> {
  readonly label: string;
  readonly actor: TimelineActor;
  readonly actorLabel?: string;
  readonly recordedAt: string;
  readonly state: TimelineEventState;
  readonly description?: ReactNode;
  readonly reference?: string;
  readonly evidenceAction?: ReactNode;
  readonly correctionAction?: ReactNode;
  readonly locale?: string;
  readonly timeZone?: string;
}

export function TimelineItem({ actor, actorLabel, className, correctionAction, description, evidenceAction, label, locale, recordedAt, reference, state, timeZone, ...props }: TimelineItemProps) {
  return (
    <li {...props} className={['noma-timeline-item', className].filter(Boolean).join(' ')} data-actor={actor} data-state={state}>
      <div aria-hidden="true" className="noma-timeline-marker" />
      <div className="noma-timeline-content">
        <div className="noma-timeline-heading"><strong>{label}</strong><StatusChip tone={STATE_TONES[state]}>{state}</StatusChip></div>
        <div className="noma-timeline-metadata">
          <span>{actorLabel ?? ACTOR_LABELS[actor]}</span>
          <time dateTime={recordedAt}>{formatMaterialTimestamp(recordedAt, { locale, timeZone })}</time>
          {reference && <span>Reference: {reference}</span>}
        </div>
        {description && <div className="noma-timeline-description">{description}</div>}
        {(evidenceAction || correctionAction) && <div className="noma-timeline-actions">{evidenceAction}{correctionAction}</div>}
      </div>
    </li>
  );
}
