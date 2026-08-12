# Noma design tokens

> **Task:** UI-001
> **Authority:** [`docs/05-design-system.md`](docs/05-design-system.md)
> **Package:** `@noma/ui`

## Purpose and layers

UI-001 establishes the first three Noma design-system layers:

```text
core values → core tokens → semantic tokens
```

UI-002 now adds component tokens and accessible primitives on top of that immutable foundation. Commerce patterns, page compositions, and surface shells remain UI-003 through UI-006 work. Feature code consumes semantic meaning whenever one exists; it does not choose raw neutral, brand, or functional colours for a business state. See [`COMPONENTS.md`](COMPONENTS.md).

The canonical source is [`packages/ui/src/tokens.ts`](packages/ui/src/tokens.ts). It records each core value once and each semantic token as an inspectable alias identity. The package build deterministically derives typed JavaScript/declarations and two static stylesheets. There is no browser token compiler and no separately maintained CSS value registry.

## Consumption

TypeScript consumers use the readonly public API:

```ts
import {
  coreTokenValues,
  semanticTokenAliases,
  resolvedTokenValues,
  type StatusTone,
} from '@noma/ui/tokens';
```

CSS consumers choose one package stylesheet:

```ts
import '@noma/ui/tokens.css';
```

or, once at the application root:

```ts
import '@noma/ui/foundations.css';
```

`foundations.css` includes the variables plus box sizing, body reset, explicit light colour scheme, semantic page/text/font defaults, reduced-motion duration overrides, and narrow forced-colour focus support. UI-002 separately generates `components.css`; applications import it after foundations.

All public custom properties are prefixed:

```text
color.text.primary            → --noma-color-text-primary
color.status.warning.background → --noma-color-status-warning-background
space.4                       → --noma-space-4
radius.md                     → --noma-radius-md
motion.duration.micro         → --noma-motion-duration-micro
```

Breakpoints remain canonical typed values such as `bp.md = 768px`. CSS custom properties are emitted for inspection and property values, but ordinary `var()` values cannot define media-query conditions. Future styling infrastructure must map the typed breakpoint registry into real queries deterministically.

## Colour meaning

The core registry contains the locked neutral scale, interim Noma brand scale, and five functional palettes. Semantic colour families cover:

- text: primary, secondary, muted, inverse, link, and genuinely disabled;
- surfaces: page, primary, secondary, elevated, selected, disabled, and scrim;
- borders: default, strong, disabled, and focus;
- actions: primary, secondary, danger, and disabled;
- status: information, success, warning, danger, and processing.

Every status family exposes `foreground`, `accent`, `background`, and `border`. Colour never carries status meaning alone: future components must pair it with an explicit label, icon, shape, position, or explanation.

### Brand is not success

Brand green and functional success are deliberately separate identities, even where an interim raw value currently overlaps. Brand remapping may change `color.surface.selected`; it cannot change confirmation truth, failure, warning, processing, primary text, or focus.

Primary actions use structural ink (`neutral.900`) and inverse text, not green. This avoids presenting ordinary actions as successful or verified before they occur.

Correct:

```css
.future-status {
  color: var(--noma-color-status-warning-foreground);
  background: var(--noma-color-status-warning-background);
}
```

Incorrect:

```css
.future-status {
  color: #78350F;
  background: #FFFBEB;
}
```

The second form bypasses semantic meaning and future remapping and is rejected in executable feature source.

## Typography and numeric truth

The local/system stack is `Inter, Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; UI-001 adds no remote font request. The exact display, heading, body, label, price, and tabular scales follow the Build Pack. Semantic type aliases cover page/section titles, body roles, control/status/compact labels, price roles, and contextual tabular numbers.

Default body/input text is 16px. Twelve-pixel labels are non-critical compact content only. Money, deadlines, and operational numbers use tabular numerals where appropriate. Critical money, status, promise, and safety information must not be intentionally truncated.

## Spacing, density, targets, and shape

Noma uses the locked 4px spacing foundation. Density modes change composition, not base readability:

| Mode | Intended surfaces | Row height | Card padding |
|---|---|---:|---:|
| `comfortable` | Marketplace, Buyer Account | 56px | 24px |
| `compact` | Seller Centre, Operations, Admin | 44px | 16px |
| `action` | Rider PWA, high-risk confirmation | 64px | 24px |

Minimum target intent is 44px by default and 48px for action contexts. UI-002 applies these values through component aliases and labelled hit regions.

Radii remain restrained (`0`, `4px`, `8px`, `12px`, `999px`). Thin borders are the ordinary separation mechanism. Shadows represent real sticky, overlay, or modal elevation and are not a default panel decoration.

## Focus, forced colours, and motion

Focus uses the neutral information blue, a 2px solid ring, and a 2px offset. The selected colour exceeds 3:1 against page, primary, secondary, and selected light surfaces. UI-002 applies this anatomy to every focusable primitive.

The foundation cooperates with operating-system forced colours. It changes only focus variables to the `Highlight` system colour and never applies global `forced-color-adjust: none`.

Motion durations are 140ms, 160ms, 220ms, and 240ms with the approved standard/exit easing. Under `prefers-reduced-motion: reduce`, all non-essential duration tokens resolve to `0ms`; information, state, progress truth, and functionality remain.

## Light-mode boundary

The Covenant pilot explicitly uses `color-scheme: light`. UI-001 exposes no `.dark` class, dark data attribute, dark media query, public theme variable, or theme switch. Semantic aliases keep later remapping possible, but a partial dark experience is prohibited.

## Contrast verification

Tests calculate WCAG relative luminance from the registry. They enforce at least 4.5:1 for ordinary required text pairs and at least 3:1 for the tested focus indicator surfaces. Baseline ratios are:

| Pair | Ratio |
|---|---:|
| primary text / primary surface | 17.8525:1 |
| secondary text / primary surface | 7.5777:1 |
| muted text / primary surface | 4.7588:1 |
| link text / primary surface | 6.7016:1 |
| info foreground / background | 9.5177:1 |
| success foreground / background | 8.7037:1 |
| warning foreground / background | 8.7485:1 |
| danger foreground / background | 9.1594:1 |
| processing foreground / background | 8.8834:1 |
| primary action foreground / background | 17.8525:1 |
| danger action foreground / background | 6.4700:1 |

Focus ratios range from 6.1173:1 to 6.7016:1 across the four required common surfaces.

Disabled controls may use the applicable WCAG exception only when they are genuinely unavailable and still understandable. Structural dividers are not automatically meaningful control boundaries; UI-002 owns component-level non-text contrast.

## Generation and policy

```powershell
pnpm ui:validate
pnpm ui:self-test
pnpm ui:test
pnpm ui:verify
```

The build writes no timestamps. A repeated generation is byte-identical. Validation rejects unknown/missing aliases, incomplete status families, contrast or focus regressions, direct status colours, invalid density/target/breakpoint values, unprefixed or drifting CSS, dark-mode exposure, missing accessibility media rules, brand/success conflation, Tailwind, deferred component work, and UI-002 dependency/client/public-type boundary regressions.

Every Web production build also inspects the emitted `.next/static` CSS. It fails if the Noma token/foundation rules were tree-shaken or unresolved, or if the previous raw scaffold colours/font stack return as an independent authority.

Policy scanning is restricted to executable and stylesheet source. Governing documentation and the validator's in-memory prohibited fixtures are not treated as feature violations.

## Prohibited usage

- Do not hardcode known functional status colours in application or feature source.
- Do not consume `brand.*` as generic success or verification truth.
- Do not use `neutral.*` where a suitable semantic token exists.
- Do not use muted text for required price, deadline, material state, safety, or critical instructions.
- Do not use disabled styling for an available action.
- Do not add partial dark mode, remote fonts, runtime token engines, Tailwind, or one-off component styles through UI-001.
- Do not begin commerce-state mapping or surface composition before their owning tasks.

## Rollback

Rollback is a reviewed source revert of UI-001, restoring the previous placeholder package and Web scaffold foundation. No database, provider, deployment, or infrastructure state requires recovery.
