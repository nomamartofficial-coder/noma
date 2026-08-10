# @noma/ui

Browser-safe Noma design-token and UI public contracts.

## Public exports

```ts
import {
  coreTokenValues,
  semanticTokenAliases,
  resolvedTokenValues,
  resolveTokenValue,
} from '@noma/ui/tokens';
```

```ts
import '@noma/ui/tokens.css';       // Variables only
import '@noma/ui/foundations.css';  // Variables plus the minimal global foundation
```

Applications normally import only `@noma/ui/foundations.css` once at their App Router root. It includes the canonical custom properties. Importing both stylesheets on the same page is unnecessary.

`packages/ui/src/tokens.ts` is the only value and alias authority. The package build derives both stylesheets from it; generated files under `dist/` are never edited by hand. Every public custom property begins with `--noma-`.

Only public exports may be imported. Deep imports are prohibited. Runtime exports remain browser-safe and have no Node, database, provider, secret, or server-observability dependency.

See [`DESIGN_TOKENS.md`](../../DESIGN_TOKENS.md) for the governing usage, accessibility, remapping, and verification contract.
