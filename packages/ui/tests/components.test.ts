import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  componentTokenAliases,
  createComponentTokenDeclarations,
  requiredComponentTokenNames,
} from '../dist/index.js';
import { renderComponentCss } from '../dist/token-output.js';

describe('component token architecture', () => {
  test('is deterministic, complete, prefixed, and semantic-colour-only', () => {
    expect(requiredComponentTokenNames).toEqual(Object.keys(componentTokenAliases).sort());
    expect(createComponentTokenDeclarations()).toEqual(createComponentTokenDeclarations());
    for (const [name, target] of Object.entries(componentTokenAliases)) {
      expect(name).toMatch(/^component\./);
      if (name.includes('.background') || name.includes('.foreground') || name.includes('.border') || name.includes('.scrim')) {
        expect(target).toMatch(/^(?:color\.|elevation\.|border\.)/);
      }
    }
    expect(Object.keys(createComponentTokenDeclarations()).every((name) => name.startsWith('--noma-component-'))).toBe(true);
  });

  test('generated CSS enforces target, focus, motion, and forced-colour contracts', () => {
    const css = renderComponentCss();
    for (const fragment of [
      'var(--noma-size-target-default)',
      'var(--noma-size-target-action)',
      ':focus-visible',
      '@media (prefers-reduced-motion: reduce)',
      '@media (forced-colors: active)',
      '.noma-choice-row',
      '.noma-dialog-popup',
      '.noma-toast-close',
    ]) expect(css).toContain(fragment);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  test('public declarations do not expose Base UI types', async () => {
    const declarations = await Promise.all([
      'index.d.ts',
      'interactive-primitives.d.ts',
      'static-primitives.d.ts',
      'form-error-summary.d.ts',
    ].map((name) => readFile(resolve(import.meta.dirname, '..', 'dist', name), 'utf8')));
    expect(declarations.join('\n')).not.toContain('@base-ui/react');
  });
});
