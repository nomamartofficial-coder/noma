import { createDisclosureProjectionRegistry, defineDisclosureProjection, projectDisclosure } from '@noma/platform/privacy';

/** Fixed, purpose-specific Access review export; never serialize an ORM record. */
export const ACCESS_REVIEW_EXPORT_PROJECTION_ID = 'access.review.export.row.v1';
export const ACCESS_REVIEW_EXPORT_ROW_CEILING = 500;

export interface AccessReviewExportRow {
  readonly reviewItemId: string;
  readonly cycleId: string;
  readonly subjectReference: string;
  readonly roleTemplateCode: string;
  readonly roleTemplateVersion: number;
  readonly scopeType: string;
  readonly dueAt: Date;
  readonly outcome: 'RETAIN_CONFIRMED' | 'REVOKE_REQUESTED' | 'NEEDS_FOLLOW_UP' | null;
  readonly completedAt: Date | null;
  readonly revocationPending: boolean;
}

export const accessReviewExportProjection = defineDisclosureProjection<AccessReviewExportRow, {
  reviewItemId: string;
  cycleId: string;
  subjectReference: string;
  roleTemplateCode: string;
  roleTemplateVersion: number;
  scopeType: string;
  dueAt: string;
  outcome: string;
  completedAt: string;
  revocationPending: boolean;
}>({
  id: ACCESS_REVIEW_EXPORT_PROJECTION_ID,
  version: 1,
  fields: [
    { key: 'reviewItemId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Exact review item reference' },
    { key: 'cycleId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Review cycle identity' },
    { key: 'subjectReference', classification: 'CONFIDENTIAL', mode: 'FULL', fullPurpose: 'Identify the reviewed authority without email or profile data' },
    { key: 'roleTemplateCode', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Identify the granted role template' },
    { key: 'roleTemplateVersion', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Identify the exact role template version' },
    { key: 'scopeType', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Identify the authority scope kind' },
    { key: 'dueAt', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'outcome', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'completedAt', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'revocationPending', classification: 'INTERNAL', mode: 'DERIVED' },
  ],
  map(source) {
    if (!Number.isSafeInteger(source.roleTemplateVersion) || source.roleTemplateVersion < 1
      || Number.isNaN(source.dueAt.getTime()) || (source.completedAt && Number.isNaN(source.completedAt.getTime()))) {
      throw new Error('Invalid Access review export row');
    }
    return {
      reviewItemId: source.reviewItemId,
      cycleId: source.cycleId,
      subjectReference: source.subjectReference,
      roleTemplateCode: source.roleTemplateCode,
      roleTemplateVersion: source.roleTemplateVersion,
      scopeType: source.scopeType,
      dueAt: source.dueAt.toISOString(),
      outcome: source.outcome ?? 'UNRESOLVED',
      completedAt: source.completedAt?.toISOString() ?? '',
      revocationPending: source.revocationPending,
    };
  },
});

const accessReviewExportRegistry = createDisclosureProjectionRegistry([accessReviewExportProjection]);

const HEADER = Object.freeze([
  'review_item_id', 'cycle_id', 'subject_reference', 'role_template_code',
  'role_template_version', 'scope_type', 'due_at', 'outcome', 'completed_at', 'revocation_pending',
] as const);

/** Apostrophe forces text interpretation when a spreadsheet strips leading whitespace. */
export function safeCsvCell(value: string): string {
  if (typeof value !== 'string' || value.length > 256 || value.includes('\0')) throw new Error('Invalid CSV field');
  const inert = /^[\s\u0001-\u001f]*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${inert.replaceAll('"', '""')}"`;
}

export function renderAccessReviewCsv(rows: readonly AccessReviewExportRow[], rowCeiling: number): string {
  if (!Number.isSafeInteger(rowCeiling) || rowCeiling < 1 || rowCeiling > ACCESS_REVIEW_EXPORT_ROW_CEILING
    || rows.length > rowCeiling) throw new Error('Access review export exceeds approved row ceiling');
  const lines = [HEADER.map(safeCsvCell).join(',')];
  for (const row of rows) {
    const projected = projectDisclosure(accessReviewExportRegistry, accessReviewExportProjection, row);
    lines.push([
      projected.reviewItemId, projected.cycleId, projected.subjectReference, projected.roleTemplateCode,
      String(projected.roleTemplateVersion), projected.scopeType, projected.dueAt,
      projected.outcome, projected.completedAt,
      projected.revocationPending ? 'YES' : 'NO',
    ].map(safeCsvCell).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function accessReviewCsvHeaders(): Readonly<Record<string, string>> {
  return Object.freeze({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="noma-access-review.csv"',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
}
