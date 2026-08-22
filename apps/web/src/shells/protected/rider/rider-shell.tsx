import { formatMaterialTimestamp } from '@noma/ui';
import type { ReactNode } from 'react';
import { ActiveNavigation } from '../../active-navigation';
import sharedStyles from '../protected-shells.module.css';
import { riderDestinations } from './navigation';
import styles from './rider.module.css';

export type RiderConnectivityState =
  | 'SERVER_CONFIRMED'
  | 'CACHED'
  | 'LOCAL_DRAFT'
  | 'PENDING_SYNC'
  | 'SYNC_FAILED'
  | 'CONFLICT'
  | 'CONNECTION_REQUIRED';

export type RiderConnectivityPresentation =
  | Readonly<{ state: 'CACHED'; cachedAt: string }>
  | Readonly<{ state: Exclude<RiderConnectivityState, 'CACHED'>; cachedAt?: never }>;

const connectivityCopy = Object.freeze({
  SERVER_CONFIRMED: { title: 'Confirmed by Noma', detail: 'This view reflects the latest server-confirmed information.', live: undefined },
  CACHED: { title: 'Cached information', detail: 'Check the recorded time before acting. Reconnect for current assignment truth.', live: undefined },
  LOCAL_DRAFT: { title: 'Local draft only', detail: 'This draft is not proof of pickup, delivery, or another completed custody action.', live: undefined },
  PENDING_SYNC: { title: 'Waiting to sync', detail: 'The action is pending and is not yet confirmed by Noma.', live: 'polite' },
  SYNC_FAILED: { title: 'Sync failed', detail: 'Keep the evidence and reconnect, then retry or contact Operations.', live: 'assertive' },
  CONFLICT: { title: 'Assignment changed', detail: 'Review the updated assignment before taking another action.', live: 'assertive' },
  CONNECTION_REQUIRED: { title: 'Connection required', detail: 'Completion cannot proceed until Noma confirms the action.', live: 'polite' },
} as const);

export function RiderConnectivityBanner({ presentation }: Readonly<{ presentation: RiderConnectivityPresentation }>) {
  const copy = connectivityCopy[presentation.state];
  const cachedTime = presentation.state === 'CACHED'
    ? formatMaterialTimestamp(presentation.cachedAt, { format: 'detailed' })
    : undefined;
  return (
    <section aria-live={copy.live} className={styles.connectivity} data-connectivity-state={presentation.state}>
      <strong>{copy.title}</strong>
      <p>{copy.detail}</p>
      {cachedTime && <p>Recorded <time dateTime={presentation.cachedAt}>{cachedTime}</time></p>}
    </section>
  );
}

export function RiderActionMode({ context, incidentHelp, instructions, nextAction, status }: Readonly<{
  context: ReactNode;
  incidentHelp: ReactNode;
  instructions: ReactNode;
  nextAction: ReactNode;
  status: ReactNode;
}>) {
  return (
    <section className={styles.actionMode} aria-label="Rider action context">
      <div className={styles.actionContext}>{context}{status}</div>
      <div className={styles.nextAction}>{nextAction}</div>
      <div className={styles.instructions}>{instructions}</div>
      <aside className={styles.incidentHelp} aria-label="Incident and help">{incidentHelp}</aside>
    </section>
  );
}

export function RiderShell({ children, connectivity }: Readonly<{
  children: ReactNode;
  connectivity?: RiderConnectivityPresentation;
}>) {
  return (
    <div className={styles.shell} data-noma-protected-shell="rider">
      <a className={sharedStyles.skipLink} href="#main-content">Skip to main content</a>
      <header className={styles.header}>
        <div><p className={styles.brand}>Noma Rider</p><p className={styles.surface}>Covenant delivery workspace</p></div>
        <ActiveNavigation
          className={styles.navigation}
          destinations={riderDestinations}
          label="Rider sections"
          linkClassName={styles.navigationLink}
          listClassName={styles.navigationList}
        />
      </header>
      {connectivity && <RiderConnectivityBanner presentation={connectivity} />}
      <main className={styles.main} id="main-content">{children}</main>
      <aside className={styles.help} aria-label="Rider help"><strong>Need operational help?</strong><span>Contact Noma Operations before continuing an uncertain custody action.</span></aside>
    </div>
  );
}
