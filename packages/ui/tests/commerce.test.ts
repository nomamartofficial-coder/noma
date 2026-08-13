import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import {
  CommerceStatus,
  MoneyBreakdown,
  StatusChip,
  commerceTokenAliases,
  createCommerceTokenDeclarations,
  formatMaterialTimestamp,
  formatMoneyMinorUnits,
  requiredCommerceTokenNames,
} from '../dist/index.js';
import { renderCommerceCss } from '../dist/token-output.js';
import { commerceTruthFixtures } from './commerce-truth-fixtures.js';

function semanticMoney(value: string): string {
  return value.replaceAll(/[^0-9-]/g, '');
}

describe('commerce token and time contracts', () => {
  test('commerce tokens are deterministic semantic aliases', () => {
    expect(requiredCommerceTokenNames).toEqual(Object.keys(commerceTokenAliases).sort());
    expect(createCommerceTokenDeclarations()).toEqual(createCommerceTokenDeclarations());
    expect(Object.keys(createCommerceTokenDeclarations()).every((name) => name.startsWith('--noma-commerce-'))).toBe(true);
    const css = renderCommerceCss();
    expect(css).toContain('.noma-commerce-status');
    expect(css).toContain('.noma-high-risk-summary');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  test('material time is exact, offset-bearing, and Lagos-aware', () => {
    expect(formatMaterialTimestamp('2026-07-30T13:30:00Z')).toContain('14:30 WAT');
    expect(formatMaterialTimestamp('2026-07-30T13:30:00Z', { format: 'compact' })).toContain('30 Jul 2026');
    expect(() => formatMaterialTimestamp('2026-07-30')).toThrow(/RFC 3339/);
    expect(() => formatMaterialTimestamp('2026-07-30T13:30:00')).toThrow(/RFC 3339/);
  });

  test('status phase owns visual meaning while announcement remains opt-in', () => {
    const requested = renderToStaticMarkup(createElement(CommerceStatus, { phase: 'requested', label: 'Refund approved' }));
    const processing = renderToStaticMarkup(createElement(CommerceStatus, { phase: 'processing', label: 'Refund processing' }));
    const uncertain = renderToStaticMarkup(createElement(CommerceStatus, { phase: 'uncertain', label: 'Outcome under reconciliation' }));
    expect(requested).toContain('data-tone="info"');
    expect(processing).toContain('data-tone="processing"');
    expect(uncertain).toContain('data-tone="warning"');
    expect(requested).not.toContain('aria-live');
    expect(renderToStaticMarkup(createElement(StatusChip, { tone: 'danger', announce: 'assertive' }, 'New failure'))).toContain('aria-live="assertive"');
  });

  test('truth fixtures preserve requested, processing, uncertain, and final distinctions', () => {
    expect(commerceTruthFixtures).toHaveLength(16);
    for (const fixture of commerceTruthFixtures) {
      for (const prohibited of fixture.mustNotClaim) expect(fixture.label).not.toBe(prohibited);
      if (fixture.phase !== 'final') expect(fixture.meaning.length).toBeGreaterThan(0);
    }
  });
});

describe('exact minor-unit money', () => {
  test('formats canonical NGN values without floating point', () => {
    expect(formatMoneyMinorUnits(0n, 'NGN')).toContain('₦0');
    expect(formatMoneyMinorUnits('1', 'NGN')).toContain('0.01');
    expect(formatMoneyMinorUnits('-1', 'NGN')).toContain('0.01');
    expect(formatMoneyMinorUnits('100', 'NGN', 'en-NG', 'always')).toContain('1.00');
    expect(formatMoneyMinorUnits('101', 'NGN')).toContain('1.01');
    expect(formatMoneyMinorUnits('125000', 'NGN')).toContain('1,250');
  });

  test('retains every digit beyond Number.MAX_SAFE_INTEGER', () => {
    const positive = formatMoneyMinorUnits('900719925474099312345', 'NGN', 'en-NG', 'always');
    const negative = formatMoneyMinorUnits('-900719925474099312345', 'NGN', 'en-NG', 'always');
    expect(semanticMoney(positive)).toBe('900719925474099312345');
    expect(semanticMoney(negative)).toBe('-900719925474099312345');
  });

  test('uses currency metadata for zero, two, and three fraction digits', () => {
    expect(semanticMoney(formatMoneyMinorUnits('123456', 'JPY', 'en-NG', 'always'))).toBe('123456');
    expect(semanticMoney(formatMoneyMinorUnits('123456', 'NGN', 'en-NG', 'always'))).toBe('123456');
    expect(formatMoneyMinorUnits('123456', 'KWD', 'en-NG', 'always')).toContain('123.456');
  });

  test.each(['12.50', '1e6', 'NaN', 'Infinity', '₦1200', '1,200', '', ' ', '001', '+1', '-0'])('rejects noncanonical input %j', (value) => {
    expect(() => formatMoneyMinorUnits(value, 'NGN')).toThrow(/canonical/);
  });

  test('rejects JavaScript number and mixed-currency override shapes', () => {
    expect(() => formatMoneyMinorUnits(100 as never, 'NGN')).toThrow(/canonical/);
    expect(() => renderToStaticMarkup(createElement(MoneyBreakdown, {
      currency: 'NGN',
      items: [{ id: 'subtotal', label: 'Subtotal', amountMinor: '100', currency: 'USD' }],
      total: { label: 'Total', amountMinor: '100' },
    } as never))).toThrow(/outer currency/);
  });
});
