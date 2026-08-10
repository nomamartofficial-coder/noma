# Noma accessible primitives

> **Task:** UI-002
> **Authority:** [`docs/05-design-system.md`](docs/05-design-system.md)
> **Package:** `@noma/ui`

## Boundary and dependencies

UI-002 adds Noma’s primitive layer over UI-001. Public props, names, styles, and declarations are Noma-owned. `@base-ui/react@1.7.0` is an internal implementation dependency used only under `packages/ui/src`; consumers never import its parts or types. `axe-core@4.13.0` is a development-only accessibility test engine.

Native HTML remains the first choice. Links, text fields, text areas, password fields, forms, tables, and pagination preserve ordinary browser semantics. Base UI supplies the bounded composite behaviour for button pending focus, select, checkbox, radio group, modal dialog/drawer, tabs, menu, and toast.

No primitive accepts raw HTML. The package does not use CSS-in-JS, Tailwind, an icon library, a form state library, or a second headless component library.

## Public inventory

| Area | Public API |
|---|---|
| Actions | `Button`, `IconButton`, `Link` |
| Fields | `Field`, `TextField`, `PasswordField`, `TextArea`, `Select`, `Checkbox`, `Radio`, `RadioGroup` |
| Overlays | `Dialog`, `Drawer` |
| Composites | `Tabs`, `Menu` |
| Data | `Table`, `TableCaption`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`, `Pagination` |
| Feedback | `ToastProvider`, `useToast` |
| Forms | `Form`, `FormErrorSummary` |

`Button` defaults to `type="button"`; callers opt into submission explicitly. Pending buttons block duplicate activation, expose `aria-busy`, keep their place in the focus order, and retain a meaningful pending label. `IconButton` requires an `aria-label`. `Link` always requires an `href` and renders an anchor.

Field composites render a visible label and deterministic description/error associations. External state controls validation timing. Disabled and read-only remain distinct native states. Password fields permit paste, autofill, and password managers. `Form` preserves `FormData`, native submission, and constraint validation. `FormErrorSummary` accepts explicit `{ fieldId, message }` records, announces the error count, can be focused through its ref after failed submission, and focuses a referenced field when its link is used.

Tables remain native tables, not ARIA grids. Pagination remains navigation through ordinary links. Page values must satisfy `1 <= currentPage <= totalPages`.

## Keyboard and focus contract

| Primitive | Required interaction |
|---|---|
| Button / link / choices | Tab order; Enter/Space according to native role |
| Select | Enter/Space open; Arrow keys, Home/End, type-ahead, Enter select, Escape close |
| Dialog / drawer | Initial focus, modal containment, Escape close, focus restoration, reachable close button |
| Tabs | Tab into list; Arrow keys/Home/End move and automatically activate local panels |
| Menu | Enter/Space open; Arrow keys/Home/End/type-ahead; Escape close and restore focus; disabled items skipped |
| Toast | Appearance never steals task focus; viewport/action/close remain keyboard reachable |

Every focusable primitive uses the UI-001 `:focus-visible` ring. Overlays provide a titled modal dialog and a close button; ordinary drawers deliberately inherit the same dialog obligations. The default target token is 44px. Action buttons use the 48px action target when `size="action"`. Checkbox and radio glyphs remain compact while their labelled hit rows meet target intent.

## Styles and component tokens

Import the package CSS once at the application root, after foundations:

```ts
import '@noma/ui/foundations.css';
import '@noma/ui/components.css';
```

`packages/ui/src/component-tokens.ts` is the component decision registry. Component colour tokens point to UI-001 semantic tokens; they do not repeat raw colour values. The build deterministically creates `dist/components.css`, and the production Web build rejects missing component output.

Reduced-motion mode removes non-essential transitions and the pending spinner animation without removing state. Forced-colours mode lets system colours own borders and focus and does not globally suppress adjustment.

## Toast policy

Toasts provide brief non-blocking operational feedback such as “Saved” or “Copied.” They are never authoritative payment, refund, custody, legal, recovery, or deadline evidence. Ordinary low-priority feedback defaults to 5.5 seconds. Warning, danger, and action-bearing toasts default to persistence (`timeout: 0`). Callers may choose polite or urgent announcements, but urgent priority must remain rare. Every toast has a keyboard-reachable close control; dismissal never requires a swipe.

Place `ToastProvider` at a narrow client boundary. Do not convert the App Router root layout into a client component solely for toast support.

## Testing and evidence limits

```powershell
pnpm ui:components:validate
pnpm ui:components:self-test
pnpm ui:components:test
pnpm ui:components:verify
pnpm ui:verify
```

Component tests use role/name queries and user-event. The axe helper disables `color-contrast` because JSDOM has no layout/paint engine; it also cannot prove focus visibility, clipping, target geometry, zoom, forced-colour rendering, reduced-motion perception, screen-reader output, or responsive visual quality. Automated passes are therefore evidence, not a WCAG certification. The PR must retain human visual/accessibility review evidence at representative narrow and wide viewports.

## Exclusions and rollback

Commerce status patterns, money, timelines, cards, role shells, navigation shells, Storybook, formal screenshot regression, dark mode, product workflows, and UI-003+ remain deferred.

Rollback is a reviewed source revert of UI-002 code, exact dependency/lockfile changes, Web CSS consumption, documentation, and traceability. No database, provider, deployment, or infrastructure state exists to recover.
