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
import '@noma/ui/commerce.css';     // Commerce-pattern tokens and presentation
```

Applications import `foundations.css`, `components.css`, and `commerce.css` once at their App Router root. `foundations.css` already contains the canonical properties, so a separate `tokens.css` import is unnecessary.

The package root exports the UI-002 primitives plus UI-003 status, responsibility/deadline, exact money, immutable timeline, safe evidence, and high-risk confirmation patterns. Static commerce modules remain Server Component compatible; only interactive modules establish narrow client boundaries. Public declarations never expose Base UI, backend, Prisma, or provider types.

`packages/ui/src/tokens.ts` is the only value and alias authority. The package build derives both stylesheets from it; generated files under `dist/` are never edited by hand. Every public custom property begins with `--noma-`.

Only public exports may be imported. Deep imports are prohibited. Runtime exports remain browser-safe and have no Node, database, provider, secret, or server-observability dependency.

See [`DESIGN_TOKENS.md`](../../DESIGN_TOKENS.md) for token authority, [`COMPONENTS.md`](../../COMPONENTS.md) for primitive behaviour, and [`COMMERCE_PATTERNS.md`](../../COMMERCE_PATTERNS.md) for UI-003 truth, precision, privacy, and confirmation boundaries.
