'use client';

import { Button, Timeline, TimelineItem } from '@noma/ui';

export interface AuditTimelineRowView {
  readonly eventId: string;
  readonly sequence: string;
  readonly occurredAt: string;
  readonly action: string;
  readonly actorType: string;
  readonly actorReference: string;
  readonly targetType: string;
  readonly targetReference: string;
  readonly outcome: string;
  readonly reasonCode: string | null;
  readonly correlationReference: string;
  readonly beforeSummary: string | null;
  readonly afterSummary: string | null;
  readonly correctsEventId: string | null;
}

export type AuditViewerState =
  | Readonly<{ kind: 'LOADING' }>
  | Readonly<{ kind: 'LOADED'; rows: readonly AuditTimelineRowView[]; hasNextPage: boolean; loadingNextPage?: boolean }>
  | Readonly<{ kind: 'EMPTY' }>
  | Readonly<{ kind: 'FILTERED_EMPTY' }>
  | Readonly<{ kind: 'ERROR' }>
  | Readonly<{ kind: 'DENIED' }>
  | Readonly<{ kind: 'MALFORMED_QUERY' }>;

export interface AuditViewerProps {
  readonly state: AuditViewerState;
  readonly onLoadNextPage?: () => void;
}

function StateMessage({ title, detail, status = false }: Readonly<{ title: string; detail: string; status?: boolean }>) {
  return (
    <section aria-live={status ? 'polite' : undefined} aria-label={title} role={status ? 'status' : undefined}>
      <h2>{title}</h2>
      <p>{detail}</p>
    </section>
  );
}

function timelineState(outcome: string) {
  return outcome === 'SUCCEEDED' ? 'confirmed' as const : 'failed' as const;
}

function actor(row: AuditTimelineRowView) {
  return row.actorType === 'HUMAN' ? 'staff' as const : 'system' as const;
}

export function AuditViewer({ state, onLoadNextPage }: AuditViewerProps) {
  if (state.kind === 'LOADING') return <StateMessage detail="Loading authorised audit history." status title="Loading audit history" />;
  if (state.kind === 'EMPTY') return <StateMessage detail="No governed audit events exist in this authorised scope." title="No audit history" />;
  if (state.kind === 'FILTERED_EMPTY') return <StateMessage detail="No governed events match the current bounded filter." title="No matching audit events" />;
  if (state.kind === 'ERROR') return <StateMessage detail="Audit history is temporarily unavailable. No result details have been disclosed." title="Audit history unavailable" />;
  if (state.kind === 'DENIED') return <StateMessage detail="This audit history is unavailable." title="Audit history unavailable" />;
  if (state.kind === 'MALFORMED_QUERY') return <StateMessage detail="The audit request could not be processed." title="Audit request unavailable" />;
  if (state.rows.length === 0) return <StateMessage detail="No governed audit events exist in this authorised scope." title="No audit history" />;

  return (
    <section aria-labelledby="audit-viewer-title">
      <header>
        <p>Internal governed evidence</p>
        <h2 id="audit-viewer-title">Privileged-action timeline</h2>
        <p>Append-only events in the exact authorised scope. Free-form evidence and raw metadata are not shown.</p>
      </header>
      <Timeline label="Privileged-action audit history">
        {state.rows.map((row) => (
          <TimelineItem
            actor={actor(row)}
            actorLabel={`${row.actorType}: ${row.actorReference}`}
            correctionAction={row.correctsEventId ? <span>Corrects event {row.correctsEventId}</span> : undefined}
            description={(
              <dl>
                <div><dt>Target</dt><dd>{row.targetType}: {row.targetReference}</dd></div>
                <div><dt>Outcome</dt><dd>{row.outcome}</dd></div>
                {row.reasonCode && <div><dt>Reason</dt><dd>{row.reasonCode}</dd></div>}
                {row.beforeSummary && <div><dt>Before</dt><dd>{row.beforeSummary}</dd></div>}
                {row.afterSummary && <div><dt>After</dt><dd>{row.afterSummary}</dd></div>}
                <div><dt>Correlation</dt><dd>{row.correlationReference}</dd></div>
              </dl>
            )}
            key={row.eventId}
            label={row.action}
            recordedAt={row.occurredAt}
            reference={row.eventId}
            state={timelineState(row.outcome)}
          />
        ))}
      </Timeline>
      {state.hasNextPage && (
        <div aria-live="polite">
          <Button {...(onLoadNextPage ? { onClick: onLoadNextPage } : {})} disabled={state.loadingNextPage === true} type="button">
            {state.loadingNextPage ? 'Loading more audit events' : 'Load more audit events'}
          </Button>
        </div>
      )}
    </section>
  );
}
