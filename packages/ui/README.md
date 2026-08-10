# @noma/ui

Browser-safe Noma design tokens and accessible primitive components.

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
import '@noma/ui/components.css';   // Component tokens and primitive presentation
```

Applications import `foundations.css` and `components.css` once at their App Router root. `foundations.css` already contains the canonical properties, so a separate `tokens.css` import is unnecessary.

The package root exports the UI-002 action, form, choice, overlay, tabs, menu, table, pagination, toast, and error-summary primitives. Static modules remain Server Component compatible; interactive modules establish their own narrow client boundaries. Public declarations never expose Base UI types.

`packages/ui/src/tokens.ts` is the only value and alias authority. The package build derives both stylesheets from it; generated files under `dist/` are never edited by hand. Every public custom property begins with `--noma-`.

Only public exports may be imported. Deep imports are prohibited. Runtime exports remain browser-safe and have no Node, database, provider, secret, or server-observability dependency.

See [`DESIGN_TOKENS.md`](../../DESIGN_TOKENS.md) for token authority and [`COMPONENTS.md`](../../COMPONENTS.md) for primitive usage, keyboard behaviour, accessibility limits, and verification.
