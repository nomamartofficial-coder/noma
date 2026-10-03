'use client';

import { useState, type FormEvent } from 'react';
import styles from './access-workspace.module.css';

interface AssignmentRow {
  readonly assignmentId: string; readonly subjectId: string; readonly subjectReference: string;
  readonly subjectType: 'HUMAN' | 'SERVICE_PRINCIPAL';
  readonly roleTemplateId: string; readonly roleTemplateCode: string; readonly roleTemplateVersion: number;
  readonly scopeType: string; readonly validFrom: string; readonly validUntil: string | null;
  readonly state: 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'REVOKED';
  readonly temporary: boolean; readonly version: number;
}
export interface AssignmentPage { readonly rows: readonly AssignmentRow[]; readonly nextCursor: string | null }

interface ApprovalRow {
  readonly requestId: string; readonly operation: string; readonly state: string;
  readonly requestorReference: string; readonly targetReference: string; readonly targetId: string;
  readonly subjectType: string; readonly roleTemplateCode: string; readonly roleTemplateVersion: number;
  readonly roleTemplateId: string; readonly scopeType: string; readonly requestedValidFrom: string;
  readonly requestedValidUntil: string | null; readonly expiresAt: string; readonly reason: string;
  readonly revocationAssignmentId: string | null; readonly revocationExpectedVersion: number | null;
  readonly consumed: boolean;
}
export interface ApprovalPage { readonly rows: readonly ApprovalRow[]; readonly nextCursor: string | null }

interface ReviewRow {
  readonly reviewItemId: string; readonly cycleId: string; readonly itemVersion: number;
  readonly subjectReference: string; readonly roleTemplateCode: string; readonly roleTemplateVersion: number;
  readonly scopeType: string; readonly dueAt: string; readonly cadence: string;
  readonly state: string; readonly outcome: string | null; readonly completedAt: string | null;
  readonly revocationPending: boolean;
}
export interface ReviewPage { readonly rows: readonly ReviewRow[]; readonly nextCursor: string | null }

interface ExportApprovalRow {
  readonly requestId: string; readonly requestorReference: string; readonly projectionId: string;
  readonly filterCategory: string; readonly rowCeiling: number; readonly reason: string;
  readonly state: string; readonly createdAt: string; readonly expiresAt: string; readonly consumed: boolean;
}
export interface ExportApprovalPage { readonly rows: readonly ExportApprovalRow[]; readonly nextCursor: string | null }

type Operation = 'assignment-query' | 'approval-query' | 'review-query'
  | 'assignment-grant-request' | 'assignment-revoke-request'
  | 'temporary-grant-request' | 'temporary-revoke-request'
  | 'approval-decide' | 'assignment-grant-execute' | 'assignment-revoke-execute'
  | 'temporary-grant-execute' | 'temporary-revoke-execute'
  | 'review-attest' | 'export-request' | 'export-decide' | 'export-execute' | 'export-approval-query';

async function send(operation: Operation, payload: object): Promise<Response> {
  return fetch(`/api/admin-access/${operation}`, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'noma-admin-v1' },
    body: JSON.stringify(payload),
  });
}

function date(value: string | null): string { return value ? new Date(value).toLocaleString() : 'No scheduled end'; }

export function AccessWorkspace({
  scopeId, authorityAssignmentId, assignments: initialAssignments, approvals: initialApprovals,
  reviews: initialReviews, exportApprovals: initialExportApprovals, initialError,
}: Readonly<{
  scopeId: string; authorityAssignmentId: string; assignments: AssignmentPage | null;
  approvals: ApprovalPage | null; reviews: ReviewPage | null; initialError: string | null;
  exportApprovals: ExportApprovalPage | null;
}>) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [approvals, setApprovals] = useState(initialApprovals);
  const [reviews, setReviews] = useState(initialReviews);
  const [exportApprovals, setExportApprovals] = useState(initialExportApprovals);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(initialError ?? 'Review exact scope and evidence before taking action.');
  const [assignmentFilter, setAssignmentFilter] = useState('ALL');
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [reviewFilter, setReviewFilter] = useState('ALL');
  const [mode, setMode] = useState<'ASSIGNMENT_GRANT' | 'TEMPORARY_ACCESS_GRANT' | 'ASSIGNMENT_REVOKE' | 'TEMPORARY_ACCESS_REVOKE'>('ASSIGNMENT_GRANT');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [exportRequestId, setExportRequestId] = useState('');

  async function refresh() {
    const base = { authorityAssignmentId, scopeId };
    const [a, p, r, e] = await Promise.all([
      send('assignment-query', { ...base, filter: assignmentFilter, pageSize: 50 }),
      send('approval-query', { ...base, filter: approvalFilter, pageSize: 50 }),
      send('review-query', { ...base, filter: reviewFilter, pageSize: 50 }),
      send('export-approval-query', { ...base, pageSize: 50 }),
    ]);
    setAssignments(a.ok ? await a.json() as AssignmentPage : null);
    setApprovals(p.ok ? await p.json() as ApprovalPage : null);
    setReviews(r.ok ? await r.json() as ReviewPage : null);
    setExportApprovals(e.ok ? await e.json() as ExportApprovalPage : null);
    if (![a, p, r, e].some((response) => response.ok)) throw new Error('Access is unavailable. Check scope and recent MFA, then retry.');
  }

  async function perform(work: () => Promise<string>) {
    setBusy(true); setNotice('Working. Do not repeat the action until the result appears.');
    try {
      const message = await work();
      try { await refresh(); setNotice(message); }
      catch { setNotice(`${message} Current lists could not be reloaded; retry the read before another action.`); }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The action could not be completed. Retry after checking current state.');
    } finally { setBusy(false); }
  }

  async function requireSuccess(operation: Operation, payload: object): Promise<Record<string, unknown>> {
    const response = await send(operation, { authorityAssignmentId, scopeId, ...payload });
    if (!response.ok) throw new Error(response.status === 404
      ? 'Access is unavailable or its state changed. Check scope, approval, and recent MFA before retrying.'
      : 'The service is unavailable. No success has been assumed; refresh before retrying.');
    return await response.json() as Record<string, unknown>;
  }

  function requestAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const chosen = assignments?.rows.find((row) => row.assignmentId === selectedAssignmentId);
    const revoke = mode.endsWith('_REVOKE');
    if (revoke && (!chosen || chosen.state !== 'ACTIVE' || chosen.temporary !== mode.startsWith('TEMPORARY_'))) {
      setNotice('Select the exact active assignment before requesting revocation.'); return;
    }
    const now = new Date();
    const temporaryEnd = mode === 'TEMPORARY_ACCESS_GRANT'
      ? new Date(String(form.get('validUntil'))) : null;
    if (temporaryEnd && (!Number.isFinite(temporaryEnd.getTime()) || temporaryEnd <= now)) {
      setNotice('Choose a future end time for temporary access.'); return;
    }
    const payload = revoke && chosen ? {
      subjectType: chosen.subjectType, targetId: chosen.subjectId, roleTemplateId: chosen.roleTemplateId,
      scopeType: chosen.scopeType, validFrom: chosen.validFrom, validUntil: chosen.validUntil,
      roleAssignmentId: chosen.assignmentId, expectedVersion: chosen.version,
    } : {
      subjectType: String(form.get('subjectType')),
      targetId: String(form.get('targetId')),
      roleTemplateId: String(form.get('roleTemplateId')),
      scopeType: String(form.get('scopeType')),
      validFrom: now.toISOString(),
      validUntil: temporaryEnd?.toISOString() ?? null,
    };
    const operation: Operation = mode === 'ASSIGNMENT_GRANT' ? 'assignment-grant-request'
      : mode === 'ASSIGNMENT_REVOKE' ? 'assignment-revoke-request'
        : mode === 'TEMPORARY_ACCESS_GRANT' ? 'temporary-grant-request' : 'temporary-revoke-request';
    void perform(async () => {
      const result = await requireSuccess(operation, {
        ...payload, reason: String(form.get('reason')),
        expiresAt: new Date(now.getTime() + 60 * 60_000).toISOString(),
        idempotencyKey: crypto.randomUUID(),
      });
      return `Request ${String(result.approvalRequestId)} is pending independent approval. No access has changed.`;
    });
  }

  function decideApproval(event: FormEvent<HTMLFormElement>, row: ApprovalRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get('confirm') !== 'yes') { setNotice('Confirm the exact target, scope, validity, and reason first.'); return; }
    const decision = (event.nativeEvent as SubmitEvent).submitter instanceof HTMLButtonElement
      ? ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement).value : '';
    if (decision !== 'APPROVE' && decision !== 'REJECT') { setNotice('Choose an exact decision.'); return; }
    void perform(async () => {
      const result = await requireSuccess('approval-decide', {
        approvalRequestId: row.requestId, decision, reason: String(form.get('reason')),
      });
      return `Request ${row.requestId} is ${String(result.state)}. An approval does not execute the change.`;
    });
  }

  function executeApproval(row: ApprovalRow) {
    const operation: Operation = row.operation === 'ASSIGNMENT_GRANT' ? 'assignment-grant-execute'
      : row.operation === 'ASSIGNMENT_REVOKE' ? 'assignment-revoke-execute'
        : row.operation === 'TEMPORARY_ACCESS_GRANT' ? 'temporary-grant-execute' : 'temporary-revoke-execute';
    void perform(async () => {
      const result = await requireSuccess(operation, { approvalRequestId: row.requestId, idempotencyKey: crypto.randomUUID() });
      return `${String(result.operation)} committed for assignment ${String(result.roleAssignmentId)}. Refresh before any further action.`;
    });
  }

  function attest(event: FormEvent<HTMLFormElement>, row: ReviewRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get('confirm') !== 'yes') { setNotice('Confirm the exact review outcome first.'); return; }
    const outcome = String(form.get('outcome'));
    void perform(async () => {
      await requireSuccess('review-attest', {
        reviewItemId: row.reviewItemId, expectedItemVersion: row.itemVersion,
        outcome, reason: String(form.get('reason')), operationId: crypto.randomUUID(),
      });
      return outcome === 'REVOKE_REQUESTED'
        ? 'Revocation was requested for independent approval. Access remains active until the separate revoke commits.'
        : outcome === 'NEEDS_FOLLOW_UP' ? 'Follow-up recorded. This review remains unresolved.'
          : 'Retention confirmed with a completed review attestation.';
    });
  }

  function requestExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void perform(async () => {
      const result = await requireSuccess('export-request', {
        filter: String(form.get('filter')), rowCeiling: Number(form.get('rowCeiling')),
        reason: String(form.get('reason')), idempotencyKey: crypto.randomUUID(),
      });
      setExportRequestId(String(result.exportRequestId));
      return `Export request ${String(result.exportRequestId)} is pending independent approval. No CSV has been generated.`;
    });
  }

  function decideExport(event: FormEvent<HTMLFormElement>, row: ExportApprovalRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get('confirm') !== 'yes') { setNotice('Review and confirm the exact bounded export request.'); return; }
    const decision = (event.nativeEvent as SubmitEvent).submitter instanceof HTMLButtonElement
      ? ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement).value : '';
    if (decision !== 'APPROVE' && decision !== 'REJECT') { setNotice('Choose an exact decision.'); return; }
    void perform(async () => {
      const result = await requireSuccess('export-decide', {
        exportRequestId: row.requestId, decision, reason: String(form.get('reason')),
      });
      return `Export request ${row.requestId} is ${String(result.state)}. No CSV has been generated.`;
    });
  }

  function downloadExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get('confirm') !== 'yes') { setNotice('Confirm the exact approved export first.'); return; }
    const requestId = String(form.get('exportRequestId'));
    void perform(async () => {
      const response = await send('export-execute', { authorityAssignmentId, scopeId, exportRequestId: requestId });
      if (!response.ok) throw new Error('Export denied, expired, consumed, or above its approved row ceiling. No file was downloaded.');
      const csv = await response.text();
      if (!response.headers.get('content-type')?.startsWith('text/csv')) throw new Error('The export response was not CSV. No file was downloaded.');
      const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      try {
        const anchor = document.createElement('a');
        anchor.href = blobUrl; anchor.download = 'noma-access-review.csv';
        document.body.append(anchor); anchor.click(); anchor.remove();
      } finally { URL.revokeObjectURL(blobUrl); }
      return 'Approved one-use CSV downloaded. Treat the file as confidential and follow the approved handling purpose.';
    });
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <p>Restricted administration · Exact scope</p>
        <h1>Access and roles</h1>
        <p>Scope {scopeId}. Requests, decisions, and effects are separate. Approval alone never changes access.</p>
        <a href="/admin/access/start">Change session or scope</a>
      </header>
      <p className={styles.notice} role="status" aria-live="polite">{busy ? 'Loading or submitting… ' : ''}{notice}</p>
      <button type="button" disabled={busy} onClick={() => void perform(async () => { await refresh(); return 'Current Access state loaded.'; })}>Refresh current state</button>

      <section className={styles.section} aria-labelledby="assignments-title">
        <h2 id="assignments-title">Scoped assignments</h2>
        <label>Show assignments <select value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value)}>
          {['ALL', 'ACTIVE', 'EXPIRED', 'REVOKED', 'TEMPORARY'].map((value) => <option key={value}>{value}</option>)}
        </select></label>
        {!assignments ? <p>Assignment details are unavailable for this authority.</p>
          : assignments.rows.length === 0 ? <p>No assignments match this scope and filter.</p> : (
            <div className={styles.tableWrap}><table><caption>Current scoped assignment evidence</caption>
              <thead><tr><th scope="col">Subject</th><th scope="col">Role</th><th scope="col">State</th><th scope="col">Validity</th><th scope="col">Action</th></tr></thead>
              <tbody>{assignments.rows.map((row) => <tr key={row.assignmentId}>
                <td>{row.subjectReference}<small>{row.subjectType}</small></td>
                <td>{row.roleTemplateCode} v{row.roleTemplateVersion}<small>{row.assignmentId}</small></td>
                <td>{row.state}{row.temporary ? ' · temporary' : ''}</td>
                <td>{date(row.validFrom)} → {date(row.validUntil)}</td>
                <td><button type="button" disabled={busy || row.state !== 'ACTIVE'} onClick={() => {
                  setSelectedAssignmentId(row.assignmentId);
                  setMode(row.temporary ? 'TEMPORARY_ACCESS_REVOKE' : 'ASSIGNMENT_REVOKE');
                  document.getElementById('assignment-request')?.focus();
                }}>Prepare revoke request</button></td>
              </tr>)}</tbody>
            </table></div>
          )}
        {assignments?.nextCursor && <p>More assignments exist. Narrow the filter before acting; this page is bounded.</p>}
      </section>

      <section className={styles.section} aria-labelledby="request-title">
        <h2 id="request-title">Request an access change</h2>
        <p>Only an independent reviewer may approve. A subsequent exact execution is required.</p>
        <form id="assignment-request" tabIndex={-1} className={styles.form} onSubmit={requestAssignment}>
          <label>Operation <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
            <option value="ASSIGNMENT_GRANT">Request role grant</option>
            <option value="TEMPORARY_ACCESS_GRANT">Request temporary grant</option>
            <option value="ASSIGNMENT_REVOKE">Request exact revocation</option>
            <option value="TEMPORARY_ACCESS_REVOKE">Request temporary early revocation</option>
          </select></label>
          {mode.endsWith('_REVOKE') ? <p>Selected assignment: {selectedAssignmentId || 'None selected above'}</p> : <>
            <label>Subject type <select name="subjectType"><option>HUMAN</option><option>SERVICE_PRINCIPAL</option></select></label>
            <label>Exact target ID <input name="targetId" required maxLength={36} /></label>
            <label>Exact role template ID <input name="roleTemplateId" required maxLength={36} /></label>
            <label>Scope type <select name="scopeType">{['SELF', 'SELLER', 'INSTITUTION', 'ORDER', 'CASE', 'ASSIGNMENT', 'FULFILMENT_LOCATION', 'QUEUE', 'CARRIER', 'PLATFORM'].map((value) => <option key={value}>{value}</option>)}</select></label>
            {mode === 'TEMPORARY_ACCESS_GRANT' && <label>Temporary expiry <input name="validUntil" type="datetime-local" required /></label>}
          </>}
          <label>Bounded reason <textarea name="reason" required minLength={1} maxLength={500} /></label>
          <button disabled={busy || (mode.endsWith('_REVOKE') && !selectedAssignmentId)}>Submit approval request</button>
        </form>
      </section>

      <section className={styles.section} aria-labelledby="approvals-title">
        <h2 id="approvals-title">Maker-checker requests</h2>
        <label>Show requests <select value={approvalFilter} onChange={(event) => setApprovalFilter(event.target.value)}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'].map((value) => <option key={value}>{value}</option>)}
        </select></label>
        {!approvals ? <p>Approval details are unavailable for this authority.</p>
          : approvals.rows.length === 0 ? <p>No requests match this scope and filter.</p> : approvals.rows.map((row) => (
            <details className={styles.card} key={row.requestId}>
              <summary>{row.operation} · {row.state} · {row.targetReference} · {row.requestId}</summary>
              <dl><div><dt>Requested by</dt><dd>{row.requestorReference}</dd></div>
                <div><dt>Exact target</dt><dd>{row.targetReference} ({row.targetId})</dd></div>
                <div><dt>Role</dt><dd>{row.roleTemplateCode} v{row.roleTemplateVersion}</dd></div>
                <div><dt>Scope</dt><dd>{row.scopeType} · {scopeId}</dd></div>
                <div><dt>Validity</dt><dd>{date(row.requestedValidFrom)} → {date(row.requestedValidUntil)}</dd></div>
                <div><dt>Request expires</dt><dd>{date(row.expiresAt)}</dd></div>
                <div><dt>Reason</dt><dd>{row.reason}</dd></div>
                {row.revocationAssignmentId && <div><dt>Exact revocation</dt><dd>{row.revocationAssignmentId} at version {row.revocationExpectedVersion}</dd></div>}
                <div><dt>Consumed</dt><dd>{row.consumed ? 'Yes' : 'No'}</dd></div>
              </dl>
              {row.state === 'PENDING' && <form className={styles.form} onSubmit={(event) => decideApproval(event, row)}>
                <label>Decision reason <textarea name="reason" required maxLength={500} /></label>
                <label className={styles.check}><input type="checkbox" name="confirm" value="yes" required /> I reviewed the exact target, scope, validity, and requestor.</label>
                <div className={styles.actions}><button name="decision" value="APPROVE" disabled={busy}>Approve</button><button name="decision" value="REJECT" disabled={busy}>Reject</button></div>
              </form>}
              {row.state === 'APPROVED' && !row.consumed && <form onSubmit={(event) => {
                event.preventDefault();
                if (new FormData(event.currentTarget).get('confirm') === 'yes') executeApproval(row);
              }} className={styles.form}>
                <label className={styles.check}><input type="checkbox" name="confirm" value="yes" required /> I confirm the current exact effect and independent approval.</label>
                <button disabled={busy}>Execute approved change</button>
              </form>}
            </details>
          ))}
        {approvals?.nextCursor && <p>More approval requests exist. Narrow the filter before acting.</p>}
      </section>

      <section className={styles.section} aria-labelledby="reviews-title">
        <h2 id="reviews-title">Access review</h2>
        <p><strong>Revoke requested</strong> is a review determination, not a completed revocation. Follow-up is not a completed review.</p>
        <label>Show review items <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value)}>
          {['ALL', 'DUE', 'OVERDUE', 'COMPLETED', 'UNRESOLVED'].map((value) => <option key={value}>{value}</option>)}
        </select></label>
        {!reviews ? <p>Review details are unavailable for this authority.</p>
          : reviews.rows.length === 0 ? <p>No review items match this scope and filter.</p> : reviews.rows.map((row) => (
            <details className={styles.card} key={row.reviewItemId}>
              <summary>{row.state} · {row.subjectReference} · {row.roleTemplateCode} · due {date(row.dueAt)}</summary>
              <dl><div><dt>Cycle</dt><dd>{row.cycleId} · {row.cadence}</dd></div>
                <div><dt>Exact item</dt><dd>{row.reviewItemId} at version {row.itemVersion}</dd></div>
                <div><dt>Outcome</dt><dd>{row.outcome ?? 'Unresolved'}</dd></div>
                <div><dt>Completed</dt><dd>{row.completedAt ? date(row.completedAt) : 'No'}</dd></div>
                <div><dt>Revocation</dt><dd>{row.revocationPending ? 'Requested; access may still be active' : 'No linked request'}</dd></div>
              </dl>
              {!row.completedAt && row.state !== 'STALE' && <form className={styles.form} onSubmit={(event) => attest(event, row)}>
                <label>Review outcome <select name="outcome">
                  <option value="RETAIN_CONFIRMED">Retain confirmed</option>
                  <option value="REVOKE_REQUESTED">Revoke requested</option>
                  <option value="NEEDS_FOLLOW_UP">Needs follow-up</option>
                </select></label>
                <label>Evidence-based reason <textarea name="reason" required maxLength={500} /></label>
                <label className={styles.check}><input type="checkbox" name="confirm" value="yes" required /> I reviewed the current exact assignment and understand the outcome.</label>
                <button disabled={busy}>Record attestation</button>
              </form>}
              {row.state === 'STALE' && <p>This item is stale. Do not attest; request a current review item.</p>}
            </details>
          ))}
        {reviews?.nextCursor && <p>More review items exist; the queue is paginated.</p>}
      </section>

      <section className={styles.section} aria-labelledby="exports-title">
        <h2 id="exports-title">Bounded access-review export</h2>
        <p>CSV export is a separate capability with independent approval, a row ceiling, one-use execution, and a specific privacy projection.</p>
        <form className={styles.form} onSubmit={requestExport}>
          <label>Review filter <select name="filter">{['ALL', 'DUE', 'OVERDUE', 'COMPLETED', 'UNRESOLVED'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Maximum rows (1–500) <input name="rowCeiling" type="number" min={1} max={500} defaultValue={100} required /></label>
          <label>Export purpose <textarea name="reason" required maxLength={500} /></label>
          <button disabled={busy}>Request export approval</button>
        </form>
        {exportRequestId && <p>Current export request ID: {exportRequestId}. It is not ready until independently approved.</p>}
        <h3>Independent export decisions</h3>
        {!exportApprovals ? <p>Export approval evidence is unavailable for this authority.</p>
          : exportApprovals.rows.length === 0 ? <p>No export approval requests in this exact scope.</p>
            : exportApprovals.rows.map((row) => <details className={styles.card} key={row.requestId}>
              <summary>{row.state} · {row.requestorReference} · {row.filterCategory} · {row.requestId}</summary>
              <dl><div><dt>Projection</dt><dd>{row.projectionId}</dd></div>
                <div><dt>Filter</dt><dd>{row.filterCategory}</dd></div>
                <div><dt>Maximum rows</dt><dd>{row.rowCeiling}</dd></div>
                <div><dt>Purpose</dt><dd>{row.reason}</dd></div>
                <div><dt>Requestor</dt><dd>{row.requestorReference}</dd></div>
                <div><dt>Expires</dt><dd>{date(row.expiresAt)}</dd></div>
                <div><dt>Consumed</dt><dd>{row.consumed ? 'Yes' : 'No'}</dd></div></dl>
              {row.state === 'PENDING' && <form className={styles.form} onSubmit={(event) => decideExport(event, row)}>
                <label>Decision reason <textarea name="reason" required maxLength={500} /></label>
                <label className={styles.check}><input name="confirm" type="checkbox" value="yes" required /> I reviewed the requestor, purpose, fixed projection, filter, expiry, and row ceiling.</label>
                <div className={styles.actions}><button name="decision" value="APPROVE" disabled={busy}>Approve export</button><button name="decision" value="REJECT" disabled={busy}>Reject export</button></div>
              </form>}
            </details>)}
        {exportApprovals?.nextCursor && <p>More export requests exist. The approval list is bounded.</p>}
        <h3>Execute an approved export</h3>
        <form className={styles.form} onSubmit={downloadExport}>
          <label>Exact approved export request ID <input name="exportRequestId" value={exportRequestId} onChange={(event) => setExportRequestId(event.target.value)} maxLength={36} required /></label>
          <label className={styles.check}><input name="confirm" type="checkbox" value="yes" required /> I am the original requestor; I understand this one-use download is limited to the approved purpose and row ceiling.</label>
          <button disabled={busy}>Download approved CSV once</button>
        </form>
      </section>
    </div>
  );
}
