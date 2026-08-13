import type { HTMLAttributes, ReactNode } from 'react';
import type { StatusTone } from './tokens.js';
import { formatMaterialTimestamp } from './commerce-time.js';

export type CommercePhase = 'requested' | 'processing' | 'final' | 'failed' | 'uncertain';
export type AnnouncementPreference = 'off' | 'polite' | 'assertive';
export type DeadlineState = 'upcoming' | 'due-soon' | 'overdue' | 'expired';

const PHASE_TONES: Readonly<Record<CommercePhase, StatusTone>> = Object.freeze({
  requested: 'info',
  processing: 'processing',
  final: 'success',
  failed: 'danger',
  uncertain: 'warning',
});

const DEADLINE_TONES: Readonly<Record<DeadlineState, StatusTone>> = Object.freeze({
  upcoming: 'info',
  'due-soon': 'warning',
  overdue: 'danger',
  expired: 'danger',
});

function classes(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export interface StatusChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  readonly tone: StatusTone;
  readonly children: ReactNode;
  readonly icon?: ReactNode;
  readonly announce?: AnnouncementPreference;
}

export function StatusChip({ announce = 'off', children, className, icon, tone, ...props }: StatusChipProps) {
  const liveProps = announce === 'off'
    ? {}
    : announce === 'polite'
      ? { role: 'status', 'aria-live': 'polite' as const, 'aria-atomic': true }
      : { role: 'alert', 'aria-live': 'assertive' as const, 'aria-atomic': true };
  return (
    <span {...props} {...liveProps} className={classes('noma-status-chip', className)} data-tone={tone}>
      {icon && <span aria-hidden="true" className="noma-status-chip-icon">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

interface TimestampPresentation {
  readonly timestamp?: string;
  readonly locale?: string;
  readonly timeZone?: string;
}

export interface CommerceStatusProps extends Omit<HTMLAttributes<HTMLElement>, 'children'>, TimestampPresentation {
  readonly phase: CommercePhase;
  readonly label: string;
  readonly description?: ReactNode;
  readonly responsibility?: ReactNode;
  readonly reference?: string;
  readonly announce?: AnnouncementPreference;
}

export function CommerceStatus({ announce = 'off', className, description, label, locale, phase, reference, responsibility, timeZone, timestamp, ...props }: CommerceStatusProps) {
  return (
    <section {...props} className={classes('noma-commerce-status', className)} data-phase={phase}>
      <StatusChip announce={announce} tone={PHASE_TONES[phase]}>{label}</StatusChip>
      {description && <div className="noma-commerce-status-description">{description}</div>}
      {responsibility && <div className="noma-commerce-status-responsibility">{responsibility}</div>}
      {(timestamp || reference) && (
        <div className="noma-commerce-status-metadata">
          {timestamp && <time dateTime={timestamp}>{formatMaterialTimestamp(timestamp, { locale, timeZone })}</time>}
          {reference && <span className="noma-commerce-reference">Reference: {reference}</span>}
        </div>
      )}
    </section>
  );
}

export interface ResponsibilityBannerProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  readonly tone: StatusTone;
  readonly ownerLabel: string;
  readonly actionLabel: string;
  readonly description?: ReactNode;
}

export function ResponsibilityBanner({ actionLabel, className, description, ownerLabel, tone, ...props }: ResponsibilityBannerProps) {
  return (
    <div {...props} className={classes('noma-commerce-banner', 'noma-responsibility-banner', className)} data-tone={tone}>
      <div><strong>{ownerLabel}</strong></div>
      <div className="noma-commerce-banner-action">{actionLabel}</div>
      {description && <div className="noma-commerce-banner-description">{description}</div>}
    </div>
  );
}

export interface DeadlineBannerProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  readonly state: DeadlineState;
  readonly label: string;
  readonly deadline: string;
  readonly description?: ReactNode;
  readonly locale?: string;
  readonly timeZone?: string;
}

export function DeadlineBanner({ className, deadline, description, label, locale, state, timeZone, ...props }: DeadlineBannerProps) {
  return (
    <div {...props} className={classes('noma-commerce-banner', 'noma-deadline-banner', className)} data-state={state} data-tone={DEADLINE_TONES[state]}>
      <StatusChip tone={DEADLINE_TONES[state]}>{label}</StatusChip>
      <time dateTime={deadline}>{formatMaterialTimestamp(deadline, { locale, timeZone })}</time>
      {description && <div className="noma-commerce-banner-description">{description}</div>}
    </div>
  );
}
