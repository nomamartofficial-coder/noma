# Noma commerce presentation patterns

> **Task:** UI-003
> **Authority:** [`docs/05-design-system.md`](docs/05-design-system.md), `REQ-UI-003`
> **Package:** `@noma/ui`

## Presentation boundary

The commerce layer presents explicit human-facing truth supplied by an authoritative feature or domain adapter. It does not import backend states, map provider results, calculate obligations, decide custody completion, authorize evidence, perform authentication, or grant approval.

```text
authoritative domain truth
        ↓
feature/domain-owned presentation adapter
        ↓
explicit presentation props
        ↓
@noma/ui commerce pattern
```

The browser, a redirect, HTTP success, queue completion, animation, colour, toast, or human status dropdown is never final commerce truth.

## Styles and server boundary

Import the generated layers once at the application root:

```ts
import '@noma/ui/foundations.css';
import '@noma/ui/components.css';
import '@noma/ui/commerce.css';
```

`commerce-tokens.ts` aliases existing semantic and component tokens; it contains no raw colour authority. Status, banner, money, timeline, and evidence modules remain Server Component compatible. Only `HighRiskConfirmation` declares a client boundary.

## Status and responsibility

`CommercePhase` is presentation vocabulary, not a lifecycle:

| Phase | Meaning | Tone |
|---|---|---|
| `requested` | intent, request, or approval exists; final outcome is not established | info |
| `processing` | accepted or in progress; explicitly non-final | processing |
| `final` | caller has established authoritative completion | success |
| `failed` | caller has established definitive failure | danger |
| `uncertain` | unknown, conflicting, timed out, or reconciling | warning |

`StatusChip` provides a short labelled semantic status. Live announcement is opt-in: `off` by default, `polite` for material asynchronous resolution, and `assertive` only for a newly emerged important failure or safety condition.

`CommerceStatus` requires both `phase` and caller-authored `label`; the phase never generates business copy. `ResponsibilityBanner` requires owner and action labels. `DeadlineBanner` requires the caller to provide `upcoming`, `due-soon`, `overdue`, or `expired`; it does not calculate SLA thresholds.

Material timestamps must be RFC 3339 instants with `Z` or an explicit offset. Components render `<time datetime>` and default to `en-NG` in `Africa/Lagos`. Relative text may supplement but never replace exact money, custody, evidence, appeal, or deadline time.

## Money

`Money` accepts only:

```ts
type MinorUnitValue = bigint | string;
```

Strings are canonical signed base-10 integers: `0`, `125000`, or `-2000`. Decimal/exponent/formatted strings, leading zeros, plus prefixes, negative zero, whitespace, and JavaScript numbers fail closed. Currency is always an explicit uppercase three-letter identifier.

Formatting preserves every integer digit. The formatter obtains the currency fraction count from `Intl.NumberFormat(...).resolvedOptions()`, creates an exact decimal exponent string, and passes that string directly to `Intl.NumberFormat`; it never converts money through JavaScript floating point.

`fractionDisplay="auto"` removes only a zero fractional part. `always` shows the currency's full standard precision and is suitable for ledger, reconciliation, payout, and refund breakdowns. Non-zero minor units are never hidden and compact notation is unavailable.

`MoneyBreakdown` receives one currency, caller-calculated immutable line items, and a caller-supplied total. It does not sum, allocate, round, price, tax, discount, refund, or determine entitlement. Item-level currency overrides are forbidden.

## Timeline and evidence

`Timeline` is an ordered list. `TimelineItem` supports:

- actor: buyer, seller, rider, staff, system, or provider;
- presentation state: pending, confirmed, failed, or superseded;
- exact recorded time, safe description, and reference;
- caller-authorised evidence action; and
- correction or reversal action.

The component renders the order supplied. It never sorts, edits, deletes, reorders, or hides superseded history. Corrections are later events or references, not mutation of earlier history.

`EvidenceCard` receives safe title/type/status metadata, recorded actor label, exact recorded time, stable reference, safe summary, and an authorised React action. It receives no file/database/provider entity, raw or signed storage URL, identity content, private message, bank detail, credential, secret, or internal risk reasoning. The owning feature controls authorization, short-lived access, scanning, storage, and append-only correction.

## High-risk confirmation

`HighRiskConfirmation` composes the UI-002 Dialog, Form, TextArea, and Button. It requires the exact object, consequence, reversibility, explicit action labels, and pending label; it can also present money, custody, visibility, approval, and assurance effects.

The least-destructive cancel action receives initial focus. Outside-click dismissal is disabled. Pending state blocks duplicate confirmation and cancellation while retaining a meaningful processing label. A required reason rejects blank or whitespace-only input and passes the original text to the owning feature.

The component is not reauthentication. Informational approval and assurance requirements do not prove they were satisfied. `onConfirm` requests an owning feature command; the server still enforces identity, assurance, capability, resource scope, state/version, evidence, maker-checker, money, and custody policy.

## Prohibited usage

- Do not import Payment, Refund, Payout, Delivery, Seller, Prisma, or provider states into `@noma/ui`.
- Do not create `paymentStatusToTone` or similar runtime domain mappers in the package.
- Do not present requested, queued, submitted, accepted, processing, or uncertain work as paid, refunded, delivered, or completed.
- Do not use a toast as financial or custody evidence.
- Do not add editable provider-final status, `mark paid`, `mark refunded`, or `mark delivered` controls.
- Do not treat a confirmation dialog as MFA, authorization, or maker-checker.

## Verification

```powershell
pnpm ui:commerce:validate
pnpm ui:commerce:self-test
pnpm ui:commerce:test
pnpm ui:commerce:verify
pnpm ui:components:verify
pnpm ui:verify
```

The validator rejects domain/provider leakage, false finality, floating-point money, numeric money APIs, mixed currency, private evidence URLs, timeline mutation, generic confirmation, authority claims, raw colours, direct Base UI imports, and broad client boundaries. Vitest covers precision, truth fixtures, semantic markup, keyboard/focus, and supported axe rules. Real-browser and human review remains required for contrast, reflow, target geometry, forced colours, reduced motion, and screen-reader speech quality.

## Rollback

Rollback is a reviewed source revert of the commerce modules, token/CSS generator, public exports, Web imports/consumer proof, tests, policy, documentation, and traceability. No database, provider, queue, deployment, or production state exists to recover.
