import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { AdminShell } from '../../../../shells/protected/admin/admin-shell';
import { adminDestinations } from '../../../../shells/protected/admin/navigation';
import { forwardAccessOperation } from '../../../../admin/access-forwarder.server';
import { AccessWorkspace, type ApprovalPage, type AssignmentPage, type ExportApprovalPage, type ReviewPage } from '../../../../admin/access-workspace';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const accessDestination = adminDestinations.filter((destination) => destination.id === 'access-roles');

export default async function AccessPage() {
  const cookieStore = await cookies();
  const serverEnvironment = process.env.NOMA_ENV ?? '';
  const publicEnvironment = process.env.NEXT_PUBLIC_NOMA_ENV ?? '';
  const remote = ['preview', 'staging', 'production'].includes(serverEnvironment);
  if (remote ? publicEnvironment !== serverEnvironment
    : ['preview', 'staging', 'production'].includes(publicEnvironment)) notFound();
  const selected = cookieStore.get(remote ? '__Host-noma_access_scope' : 'noma_access_scope')?.value;
  const parts = selected?.split('.');
  const scopeId = parts?.[0];
  const authorityAssignmentId = parts?.[1];
  if (parts?.length !== 2 || !scopeId || !UUID.test(scopeId)
    || !authorityAssignmentId || !UUID.test(authorityAssignmentId)) notFound();
  const webOrigin = process.env.PUBLIC_WEB_ORIGIN ?? 'http://127.0.0.1:3000';
  const cookieHeader = cookieStore.toString();
  const query = async (operation: 'assignment-query' | 'approval-query' | 'review-query' | 'export-approval-query', body: object) => forwardAccessOperation(
    new Request(`${webOrigin}/api/admin-access/${operation}`, {
      method: 'POST', headers: {
        Origin: webOrigin, 'X-CSRF-Token': 'noma-admin-v1', 'Content-Type': 'application/json',
        Cookie: cookieHeader,
      }, body: JSON.stringify({ authorityAssignmentId, scopeId, ...body }),
    }), operation,
  );
  const [assignments, approvals, reviews, exportApprovals] = await Promise.all([
    query('assignment-query', { filter: 'ALL', pageSize: 50 }),
    query('approval-query', { filter: 'ALL', pageSize: 50 }),
    query('review-query', { filter: 'ALL', pageSize: 50 }),
    query('export-approval-query', { pageSize: 50 }),
  ]);
  if (!assignments.ok && !approvals.ok && !reviews.ok && !exportApprovals.ok) notFound();
  const assignmentPage = assignments.ok ? await assignments.json() as AssignmentPage : null;
  const approvalPage = approvals.ok ? await approvals.json() as ApprovalPage : null;
  const reviewPage = reviews.ok ? await reviews.json() as ReviewPage : null;
  const exportApprovalPage = exportApprovals.ok ? await exportApprovals.json() as ExportApprovalPage : null;
  return (
    <AdminShell destinations={accessDestination} scopeLabel={`Access scope ${scopeId}`}>
      <AccessWorkspace
        scopeId={scopeId} authorityAssignmentId={authorityAssignmentId}
        assignments={assignmentPage} approvals={approvalPage} reviews={reviewPage} exportApprovals={exportApprovalPage}
        initialError={assignments.status === 503 || approvals.status === 503 || reviews.status === 503 || exportApprovals.status === 503 ? 'Access data is temporarily unavailable. Retry shortly.' : null}
      />
    </AdminShell>
  );
}
