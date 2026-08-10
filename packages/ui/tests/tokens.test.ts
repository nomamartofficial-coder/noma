import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { contrastRatio, relativeLuminance } from '../src/contrast.js';
import { renderFoundationCss, renderTokenCss } from '../src/token-output.js';
import {
  coreTokenValues,
  createCssTokenDeclarations,
  densityModes,
  resolveTokenValue,
  resolvedTokenValues,
  semanticTokenAliases,
  statusTones,
  toCssVariableName,
  tokenRegistry,
} from '../src/tokens.js';

const requiredContrastPairs = [
  ['text.primary', 'color.text.primary', 'color.surface.primary', 17.8525],
  ['text.secondary', 'color.text.secondary', 'color.surface.primary', 7.5777],
  ['text.muted', 'color.text.muted', 'color.surface.primary', 4.7588],
  ['text.link', 'color.text.link', 'color.surface.primary', 6.7016],
  ['status.info', 'color.status.info.foreground', 'color.status.info.background', 9.5177],
  ['status.success', 'color.status.success.foreground', 'color.status.success.background', 8.7037],
  ['status.warning', 'color.status.warning.foreground', 'color.status.warning.background', 8.7485],
  ['status.danger', 'color.status.danger.foreground', 'color.status.danger.background', 9.1594],
  ['status.processing', 'color.status.processing.foreground', 'color.status.processing.background', 8.8834],
  ['action.primary', 'color.action.primary.foreground', 'color.action.primary.background', 17.8525],
  ['action.danger', 'color.action.danger.foreground', 'color.action.danger.background', 6.47],
] as const;

const focusPairs = [
  ['page', 'color.surface.page', 6.4052],
  ['primary', 'color.surface.primary', 6.7016],
  ['secondary', 'color.surface.secondary', 6.1173],
  ['selected', 'color.surface.selected', 6.4021],
] as const;

describe('canonical core and semantic registry', () => {
  test('locks the exact neutral, brand, and functional colour contracts', () => {
    expect(Object.fromEntries(Object.entries(coreTokenValues).filter(([name]) => name.startsWith('color.neutral.') && name !== 'color.neutral.950.scrim'))).toEqual({
      'color.neutral.0': '#FFFFFF',
      'color.neutral.25': '#FCFCFD',
      'color.neutral.50': '#F8FAFC',
      'color.neutral.100': '#F1F5F9',
      'color.neutral.200': '#E2E8F0',
      'color.neutral.300': '#CBD5E1',
      'color.neutral.400': '#94A3B8',
      'color.neutral.500': '#64748B',
      'color.neutral.600': '#475569',
      'color.neutral.700': '#334155',
      'color.neutral.800': '#1E293B',
      'color.neutral.900': '#0F172A',
      'color.neutral.950': '#020617',
    });
    expect(Object.fromEntries(Object.entries(coreTokenValues).filter(([name]) => name.startsWith('color.brand.')))).toEqual({
      'color.brand.50': '#F0FDF4',
      'color.brand.100': '#DCFCE7',
      'color.brand.200': '#BBF7D0',
      'color.brand.500': '#16A34A',
      'color.brand.600': '#15803D',
      'color.brand.700': '#166534',
      'color.brand.800': '#14532D',
      'color.brand.900': '#052E16',
    });
    expect(Object.keys(coreTokenValues).filter((name) => name.startsWith('color.functional.'))).toHaveLength(20);
    expect(coreTokenValues['color.surface.scrim' as keyof typeof coreTokenValues]).toBeUndefined();
    expect(resolveTokenValue('color.surface.scrim')).toBe('rgb(2 6 23 / 56%)');
  });

  test('keeps every authority object immutable at runtime', () => {
    expect(Object.isFrozen(coreTokenValues)).toBe(true);
    expect(Object.isFrozen(semanticTokenAliases)).toBe(true);
    expect(Object.isFrozen(tokenRegistry)).toBe(true);
    expect(Object.isFrozen(tokenRegistry.core)).toBe(true);
    expect(Object.isFrozen(statusTones)).toBe(true);
    expect(Object.isFrozen(densityModes)).toBe(true);
  });

  test('resolves every semantic alias and rejects unknown or cyclic identities', () => {
    for (const name of Object.keys(semanticTokenAliases)) expect(resolveTokenValue(name)).toBeTruthy();
    expect(() => resolveTokenValue('color.unknown')).toThrow(/Unknown token reference/);
    expect(() => resolveTokenValue('a', { core: {}, aliases: { a: 'b', b: 'a' } })).toThrow(/cycle/);
  });

  test('provides every four-part status family without conflating brand and success', () => {
    for (const tone of statusTones) {
      for (const part of ['foreground', 'accent', 'background', 'border']) {
        expect(semanticTokenAliases).toHaveProperty(`color.status.${tone}.${part}`);
      }
    }
    for (const [name, target] of Object.entries(semanticTokenAliases)) {
      if (name.startsWith('color.status.success.')) expect(target).toMatch(/^color\.functional\.success\./);
    }
    expect(semanticTokenAliases['color.surface.selected']).toBe('color.brand.50');
  });

  test('locks typography, spacing, density, targets, breakpoints, shape, elevation, focus, and motion', () => {
    expect(coreTokenValues['font.family.sans']).toBe('Inter, Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
    expect(coreTokenValues['type.scale.heading.md.fontWeight']).toBe('700');
    expect(coreTokenValues['type.scale.heading.sm.fontWeight']).toBe('600');
    expect(coreTokenValues['type.scale.body.md.fontSize']).toBe('16px');
    expect(coreTokenValues['type.scale.numeric.price.lg.fontVariantNumeric']).toBe('tabular-nums');
    expect(coreTokenValues['space.20']).toBe('80px');
    expect(coreTokenValues['density.comfortable.row.height']).toBe('56px');
    expect(coreTokenValues['density.compact.row.height']).toBe('44px');
    expect(coreTokenValues['density.action.row.height']).toBe('64px');
    expect(coreTokenValues['size.target.default']).toBe('44px');
    expect(coreTokenValues['size.target.action']).toBe('48px');
    expect([coreTokenValues['bp.xs'], coreTokenValues['bp.sm'], coreTokenValues['bp.md'], coreTokenValues['bp.lg'], coreTokenValues['bp.xl'], coreTokenValues['bp.2xl']]).toEqual(['0px', '480px', '768px', '1024px', '1280px', '1440px']);
    expect(coreTokenValues['radius.full']).toBe('999px');
    expect(coreTokenValues['border.focus']).toBe('2px');
    expect(resolveTokenValue('elevation.modal')).toBe('0 12px 32px rgb(15 23 42 / 14%)');
    expect(resolveTokenValue('focus.ring.color')).toBe('#1D4ED8');
    expect(coreTokenValues['motion.duration.page']).toBe('240ms');
  });

  test('remaps brand-facing semantics without changing status, text, or focus truth', () => {
    const remapped = {
      core: { ...coreTokenValues, 'color.brand.50': '#FFF7ED' },
      aliases: { ...semanticTokenAliases },
    };
    expect(resolveTokenValue('color.surface.selected', remapped)).toBe('#FFF7ED');
    for (const name of [
      'color.status.success.foreground',
      'color.status.danger.foreground',
      'color.status.warning.foreground',
      'color.status.processing.foreground',
      'color.text.primary',
      'focus.ring.color',
    ]) {
      expect(resolveTokenValue(name, remapped)).toBe(resolveTokenValue(name));
    }
  });
});

describe('WCAG 2.2 contrast calculations', () => {
  test('uses the WCAG relative-luminance algorithm rather than colour distance', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#FFFFFF')).toBe(1);
    expect(contrastRatio('#000000', '#FFFFFF')).toBe(21);
    expect(() => contrastRatio('rgb(0 0 0)', '#FFFFFF')).toThrow(/six-digit hex/);
  });

  test.each(requiredContrastPairs)('%s meets ordinary-text contrast with a recomputed ratio', (_label, foreground, background, expected) => {
    const ratio = contrastRatio(resolvedTokenValues[foreground], resolvedTokenValues[background]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeCloseTo(expected, 3);
  });

  test.each(focusPairs)('focus ring meets non-text contrast on %s surface', (_surface, background, expected) => {
    const ratio = contrastRatio(resolvedTokenValues['focus.ring.color'], resolvedTokenValues[background]);
    expect(ratio).toBeGreaterThanOrEqual(3);
    expect(ratio).toBeCloseTo(expected, 3);
  });
});

describe('deterministic CSS output', () => {
  test('maps every token to one prefixed custom property with exact parity', () => {
    const expected = createCssTokenDeclarations();
    expect(Object.keys(expected).every((name) => name.startsWith('--noma-'))).toBe(true);
    expect(new Set(Object.keys(expected)).size).toBe(Object.keys(expected).length);
    expect(expected[toCssVariableName('color.text.primary')]).toBe('var(--noma-color-neutral-900)');

    const css = readFileSync(new URL('../dist/tokens.css', import.meta.url), 'utf8');
    for (const [name, value] of Object.entries(expected)) expect(css).toContain(`${name}: ${value};`);
    expect((css.match(/^\s+--noma-[^:]+:/gm) ?? [])).toHaveLength(Object.keys(expected).length);
  });

  test('renders byte-identical CSS on repeated generation', () => {
    expect(renderTokenCss()).toBe(renderTokenCss());
    expect(renderFoundationCss()).toBe(renderFoundationCss());
    expect(readFileSync(new URL('../dist/tokens.css', import.meta.url), 'utf8')).toBe(renderTokenCss());
    expect(readFileSync(new URL('../dist/foundations.css', import.meta.url), 'utf8')).toBe(renderFoundationCss());
  });

  test('establishes light foundations, zero-duration reduced motion, and narrow forced colours', () => {
    const css = renderFoundationCss();
    expect(css).toContain('color-scheme: light;');
    expect(css).toContain('background: var(--noma-color-surface-page);');
    expect(css).toContain('color: var(--noma-color-text-primary);');
    expect(css).toContain('font-family: var(--noma-font-family-sans);');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('--noma-motion-duration-page: 0ms;');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain('--noma-focus-ring-color: Highlight;');
    expect(css).not.toContain('forced-color-adjust: none');
    expect(css).not.toMatch(/prefers-color-scheme:\s*dark|\.dark\b|data-theme=["']?dark/i);
  });
});
