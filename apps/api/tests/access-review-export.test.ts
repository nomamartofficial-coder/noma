import { describe, expect, test } from 'vitest';
import { accessReviewCsvHeaders, renderAccessReviewCsv, safeCsvCell } from '../src/authorization/access-review-export.js';

const row = Object.freeze({
  reviewItemId: '10000000-0000-4000-8000-000000000001',
  cycleId: '10000000-0000-4000-8000-000000000002',
  subjectReference: 'NOMA-SYNTHETIC',
  roleTemplateCode: 'access.synthetic',
  roleTemplateVersion: 1,
  scopeType: 'INSTITUTION',
  dueAt: new Date('2026-10-31T00:00:00.000Z'),
  outcome: null,
  completedAt: null,
  revocationPending: false,
} as const);

describe('IAM-009 bounded Access review CSV', () => {
  test.each(['=1+1', '+SUM(1,2)', '-1+2', '@cmd', ' \t=1', '\r\n=1'])('forces dangerous leading value %j to inert text', (value) => {
    expect(safeCsvCell(value)).toBe(`"'${value.replaceAll('"', '""')}"`);
  });

  test('quotes delimiters, quotes, line endings, and Unicode deterministically', () => {
    expect(safeCsvCell('A,"B"\r\nỌlọ́run')).toBe('"A,""B""\r\nỌlọ́run"');
    expect(() => safeCsvCell('x\0y')).toThrow('Invalid CSV field');
  });

  test('uses only fixed columns and bounded rows without reasons or private authentication data', () => {
    const csv = renderAccessReviewCsv([row], 1);
    expect(csv).toContain('"review_item_id","cycle_id","subject_reference"');
    expect(csv).toContain('"UNRESOLVED","","NO"');
    expect(csv).not.toMatch(/reason|session|mfa|email|password/i);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(() => renderAccessReviewCsv([row, row], 1)).toThrow(/row ceiling/);
    expect(() => renderAccessReviewCsv([], 501)).toThrow(/row ceiling/);
    expect(accessReviewCsvHeaders()['Cache-Control']).toBe('no-store');
    expect(accessReviewCsvHeaders()['Content-Disposition']).toBe('attachment; filename="noma-access-review.csv"');
  });
});
