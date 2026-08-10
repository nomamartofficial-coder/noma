import { createCssTokenDeclarations } from './tokens.js';

const GENERATED_HEADER = `/* Generated from packages/ui/src/tokens.ts. Do not edit by hand. */`;

function renderRootDeclarations(): string {
  const declarations = Object.entries(createCssTokenDeclarations())
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return `:root {\n  color-scheme: light;\n${declarations}\n}`;
}

export function renderTokenCss(): string {
  return `${GENERATED_HEADER}\n${renderRootDeclarations()}\n`;
}

export function renderFoundationCss(): string {
  return `${GENERATED_HEADER}
${renderRootDeclarations()}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  color-scheme: light;
}

body {
  margin: 0;
  background: var(--noma-color-surface-page);
  color: var(--noma-color-text-primary);
  font-family: var(--noma-font-family-sans);
  font-size: var(--noma-type-body-default-font-size);
  font-weight: var(--noma-type-body-default-font-weight);
  line-height: var(--noma-type-body-default-line-height);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --noma-motion-duration-micro: 0ms;
    --noma-motion-duration-popover: 0ms;
    --noma-motion-duration-overlay: 0ms;
    --noma-motion-duration-page: 0ms;
  }
}

@media (forced-colors: active) {
  :root {
    --noma-focus-ring-color: Highlight;
    --noma-color-border-focus: Highlight;
  }
}
`;
}
