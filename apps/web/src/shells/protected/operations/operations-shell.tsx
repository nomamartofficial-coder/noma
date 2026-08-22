import { Link, Pagination, Table, TableBody, TableCaption, TableCell, TableHead, TableHeaderCell, TableRow } from '@noma/ui';
import type { ReactNode } from 'react';
import { ActiveNavigation } from '../../active-navigation';
import { CompactShellNavigation } from '../compact-shell-navigation';
import sharedStyles from '../protected-shells.module.css';
import type { OperationsWorkspaceDestination } from './navigation';
import styles from './operations.module.css';

export interface OperationsQueueRowPresentation {
  readonly ageOrDeadline: string;
  readonly nextActionHref: string;
  readonly nextActionLabel: string;
  readonly owner: string;
  readonly reference: string;
  readonly status: string;
}

export function OperationsQueueFrame({ children, filterContext, notice, resultContext, scope, title }: Readonly<{
  children: ReactNode;
  filterContext?: ReactNode;
  notice?: ReactNode;
  resultContext?: ReactNode;
  scope: string;
  title: string;
}>) {
  return (
    <section className={styles.queueFrame}>
      <header><p className={styles.scope}>{scope}</p><h1>{title}</h1>{notice}</header>
      {filterContext && <div className={styles.filterContext}>{filterContext}</div>}
      {resultContext && <div className={styles.resultContext}>{resultContext}</div>}
      {children}
    </section>
  );
}

export function OperationsQueueTable({ caption, currentPage, pageHref, rows, totalPages }: Readonly<{
  caption: string;
  currentPage: number;
  pageHref: (page: number) => string;
  rows: readonly OperationsQueueRowPresentation[];
  totalPages: number;
}>) {
  return (
    <div className={styles.queueTable}>
      <Table density="compact">
        <TableCaption>{caption}</TableCaption>
        <TableHead><TableRow><TableHeaderCell scope="col">Reference</TableHeaderCell><TableHeaderCell scope="col">Status</TableHeaderCell><TableHeaderCell scope="col">Age / deadline</TableHeaderCell><TableHeaderCell scope="col">Owner</TableHeaderCell><TableHeaderCell scope="col">Next action</TableHeaderCell></TableRow></TableHead>
        <TableBody>{rows.map((row) => <TableRow key={row.reference}><TableHeaderCell scope="row">{row.reference}</TableHeaderCell><TableCell>{row.status}</TableCell><TableCell>{row.ageOrDeadline}</TableCell><TableCell>{row.owner}</TableCell><TableCell><Link href={row.nextActionHref}>{row.nextActionLabel}</Link></TableCell></TableRow>)}</TableBody>
      </Table>
      <Pagination currentPage={currentPage} getPageHref={pageHref} totalPages={totalPages} />
    </div>
  );
}

export function OperationsShell({ children, destinations, scopeLabel }: Readonly<{
  children: ReactNode;
  destinations: readonly OperationsWorkspaceDestination[];
  scopeLabel: string;
}>) {
  return (
    <div className={styles.shell} data-noma-protected-shell="operations">
      <a className={sharedStyles.skipLink} href="#main-content">Skip to main content</a>
      <header className={styles.header}><div><p className={styles.brand}>Noma Operations</p><p className={styles.scope}>{scopeLabel}</p></div><CompactShellNavigation destinations={destinations} label="Operations workspaces" /></header>
      <div className={styles.layout}>
        <aside className={styles.rail}><ActiveNavigation className={styles.navigation} destinations={destinations} label="Operations workspaces" linkClassName={styles.navigationLink} listClassName={styles.navigationList} /></aside>
        <main className={styles.main} id="main-content">{children}</main>
      </div>
    </div>
  );
}
