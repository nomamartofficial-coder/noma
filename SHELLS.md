# Noma Marketplace and Buyer Account shells

UI-004 establishes application-owned consumer navigation and layout scaffolding in `apps/web`. It does not implement Marketplace business pages, Buyer data, authentication, sessions, memberships, or authorization.

## Route architecture

`app/layout.tsx` owns the document and imports the Noma foundation, component, commerce, and global styles once. The invisible `(marketplace)` route group owns `/`, `/search`, `/categories`, and `/cart`; the invisible `(buyer)` group owns `/account` and its section entries. `/health/live` and `/health/ready` remain outside both shells.

Each shell layout owns exactly one `<main id="main-content">`, so route pages render sections rather than nested main landmarks. The root layout never renders consumer navigation.

## Marketplace shell

The public header contains the Noma home link, Covenant University context, a native GET search form targeting `/search`, Categories, Cart, and the supplied surface switcher. The public footer activates only destinations that resolve; future help, protection, legal, and selling concepts remain non-link text.

On screens below 768 CSS pixels the global consumer navigation contains exactly Home, Categories, Search, Orders, and Cart. It respects the device safe area and uses the current pathname for presentation only.

## Buyer Account shell

Buyer Account retains the consumer header and a clear Shop on Noma path, but uses an obligation-oriented “My account” composition. At 1024 CSS pixels and above, the nine approved account sections use a persistent rail. From 768–1023 and on mobile, the same destinations use the existing accessible Menu primitive. Mobile retains the one global consumer bottom navigation and never adds a second account bar.

The account subtree supplies a textual loading boundary with decorative `aria-hidden` geometry and a safe client error boundary. The error boundary ignores raw exception content and offers only retry and account-overview recovery.

## Presentation and authority boundary

Navigation presence is not authorization. A current item is not a capability grant, a hidden item does not secure a route, and a pathname does not prove membership. Future IAM and API work must authenticate, restore safe deep links, enforce capability/resource/institution scope, and deny without exposing sensitive record existence.

`SurfaceDestination` is a readonly, serializable presentation model. Production supplies only Shop on Noma and My account. Seller, Rider, Operations, and Admin examples exist only in synthetic tests and review evidence until trusted server policy supplies real memberships.

The shell never queries or invents users, products, prices, carts, counts, orders, messages, cases, refunds, reviews, verification, or notifications. Minimal route placeholders explain implementation status and do not represent authoritative empty data or satisfy MKT-001, BUY-001, IAM-010, SRC-002, or CRT-001.

## Rendering, CSS, and accessibility

Layouts, pages, header, search, footer, and placeholder content remain Server Components. Client Components are limited to pathname-aware navigation, Menu-backed surface/account controls, and the account error boundary.

Web-owned CSS modules consume existing Noma semantic and component tokens. Breakpoints are 768 and 1024 CSS pixels; the supported review range begins at 320 pixels. The shell includes a skip link, named navigation landmarks, one H1 per route state, 44-pixel minimum controls, visible focus, reduced-motion and forced-colour handling, and safe-area bottom padding.

Run `pnpm ui:shells:verify` for deterministic routes, policy self-tests, unit/component interaction, and supported axe checks. Real-browser keyboard, reflow, zoom, target geometry, and assistive-technology review remain required evidence.

## Deferred integration

UI-005 owns Seller, Rider, Operations, and Admin shells. IAM owns authentication and protected-route authority. Marketplace, Search, Cart, Buyer order, notification, messaging, protection, refund, review, verification, and security tasks replace the relevant shell placeholders only when their dependencies and server controls are implemented.
