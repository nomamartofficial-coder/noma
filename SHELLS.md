# Noma application shells

UI-004 establishes application-owned consumer navigation and layout scaffolding in `apps/web`. It does not implement Marketplace business pages, Buyer data, authentication, sessions, memberships, or authorization.

UI-005 adds distinct Seller Centre, Rider, Operations, and Restricted Administration presentation shells. Every UI-005 production route fails closed before its shell renders because IAM has not yet supplied an authoritative allow decision.

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

### Protected role surfaces before IAM

Seller, Rider, Operations, and Admin routes live in separate invisible route groups and call `requireProtectedSurfaceAccess` as the first runtime statement in their nested layout. The server-only resolver always invokes stable `notFound()`. It does not read a query parameter, cookie, header, environment flag, browser state, pathname, development mode, or fake session. Direct links therefore receive the same non-enumerating “Page unavailable” response and never render shell navigation, fixture content, or protected markers.

This boundary is deliberately narrow so IAM can later replace the unconditional denial with authenticated, scoped policy. Navigation is not authorization, destination presence is only presentation input, and no UI-005 component grants a capability.

## Seller Centre

Seller Centre has its own compact operational identity and canonical navigation for Overview, Orders, Listings, Inventory, Fulfilment, Messages, Cases, Earnings, Payouts, Performance, and Store Settings. An optional `SellerContextPresentation` may display a server-supplied seller label and scope, but never selects or authorizes a seller. The mobile/tablet menu becomes a persistent compact rail from 1024 CSS pixels.

## Rider workspace

Rider uses a one-column, touch-forward action posture rather than the Seller or staff layouts. `RiderActionMode` separates supplied context and status from the next action, instructions, and incident/help recovery. Critical actions use the Noma 48-pixel action target.

`RiderConnectivityBanner` distinguishes server-confirmed, cached, local-draft, pending-sync, sync-failed, conflict, and connection-required information. Cached information includes an exact material timestamp. Local or pending state never proves pickup, delivery, custody transfer, or other business completion. UI-005 adds no service worker, background sync, storage, or network-state authority; RDR-003 owns those later capabilities.

## Operations workspaces

Operations accepts an explicit readonly subset of workspace destinations and never infers staff grants from the route. It provides an obligation-oriented queue frame and the existing semantic compact Table and Pagination primitives. Queue rows are safe presentation inputs for reference, status, age or deadline, owner, and a caller-authorised detail link. UI-005 performs no fetch, mutation, sorting, calculation, or bulk action.

## Restricted Administration

Restricted Administration renders only explicitly supplied destinations. Its static review frame separates current value, proposed value, scope, consequence, approval expectation, and reason. It contains no command callbacks, configuration toggles, one-tap emergency controls, or default access to every administration area.

The shell never queries or invents users, products, prices, carts, counts, orders, messages, cases, refunds, reviews, verification, or notifications. Minimal route placeholders explain implementation status and do not represent authoritative empty data or satisfy MKT-001, BUY-001, IAM-010, SRC-002, or CRT-001.

## Rendering, CSS, and accessibility

Layouts, pages, header, search, footer, and placeholder content remain Server Components. Client Components are limited to pathname-aware navigation, Menu-backed surface/account controls, and the account error boundary.

Web-owned CSS modules consume existing Noma semantic and component tokens. Breakpoints are 768 and 1024 CSS pixels; the supported review range begins at 320 pixels. The shell includes a skip link, named navigation landmarks, one H1 per route state, 44-pixel minimum controls, visible focus, reduced-motion and forced-colour handling, and safe-area bottom padding.

Run `pnpm ui:shells:verify` for UI-004 or `pnpm ui:role-shells:verify` for UI-005. The aggregate `pnpm ui:verify` covers both generations. UI-005 verification includes route and policy negative tests, unit/component interaction, representative axe scans, a production build, and no-JavaScript direct-link probes that prove fail-closed behavior. Real-browser keyboard, reflow, zoom, target geometry, forced-colour, reduced-motion, and assistive-technology review remain required evidence.

## Deferred integration

IAM owns authentication and protected-route authority. Seller, Rider, Operations, Admin, Marketplace, Search, Cart, Buyer order, notification, messaging, protection, refund, review, verification, and security tasks replace the relevant shell placeholders only when their dependencies and server controls are implemented. UI-006 remains not started and owns Storybook/component documentation and visual regression infrastructure.
