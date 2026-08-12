import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Runs rules supported by JSDOM. Colour contrast, visual focus, clipping, and
 * physical target geometry require the documented browser/human review.
 */
export async function expectNoAxeViolations(root: Element): Promise<void> {
  const result = await axe.run(root, {
    rules: {
      'color-contrast': { enabled: false },
      'scrollable-region-focusable': { enabled: false },
    },
  });
  expect(result.violations, result.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
}
