import type { AccessPrivilegeClass } from '@noma/platform/access';

export function nextAccessReviewDueAt(from: Date, privilegeClass: AccessPrivilegeClass): Date {
  if (!(from instanceof Date) || !Number.isFinite(from.getTime())) throw new Error('Review scheduling requires a valid instant');
  const months = privilegeClass === 'PRIVILEGED' ? 1 : 3;
  const absoluteMonth = from.getUTCFullYear() * 12 + from.getUTCMonth() + months;
  const year = Math.floor(absoluteMonth / 12);
  const month = absoluteMonth % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(from.getUTCDate(), lastDay),
    from.getUTCHours(), from.getUTCMinutes(), from.getUTCSeconds(), from.getUTCMilliseconds()));
}
