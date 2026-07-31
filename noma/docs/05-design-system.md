# Noma Design Foundation, Commerce Patterns, Components, States, Responsive Behaviour, and Accessibility

> **Repository path:** `docs/05-design-system.md`  
> **Status:** Binding Covenant pilot design-system contract  
> **Version:** 1.0  
> **Effective date:** 30 July 2026  
> **Applies to:** Noma's two-month Covenant University pilot build  
> **Primary audience:** Founders, Product, Design, Content, Engineering, Codex, Quality Assurance, Accessibility, Operations, Support, Finance, Trust and Safety, Logistics, and future contributors

---

## 1. Purpose

This document defines the visual, interaction, component, responsive, accessibility, and design-governance foundation for Noma's controlled Covenant University marketplace pilot.

It translates:

- the locked product boundary in `docs/01-mvp-scope.md`;
- the actor, authority, field-visibility, and separation-of-duty rules in `docs/02-user-roles.md`;
- the end-to-end happy paths, exception paths, and honest completion conditions in `docs/03-user-journeys.md`; and
- the surface, navigation, route, page, content hierarchy, and page-anatomy rules in `docs/04-information-architecture.md`

into a reusable Noma Commerce Pattern Library for:

- the public Marketplace;
- Buyer Account;
- Seller Centre;
- Rider PWA;
- Noma Operations and specialist workspaces; and
- Restricted Administration.

The objective is to prevent Design, Engineering, Codex, and future contributors from independently inventing:

- visual styles;
- spacing and layout rules;
- status colours and labels;
- buttons and confirmation behaviour;
- product and offer cards;
- table and queue patterns;
- loading, empty, error, offline, and uncertain states;
- responsive behaviour;
- accessibility behaviour; or
- one-off components that contradict the product model.

This document is not a decorative brand mood board. It is an implementation contract for a marketplace handling identity, inventory, money, custody, evidence, customer protection, privileged operations, and emergency controls.

A screen is not well designed merely because it looks polished. It is well designed when the intended actor can quickly and accurately understand:

1. where they are;
2. what object or obligation they are viewing;
3. the current truthful state;
4. who must act next;
5. the applicable deadline, promise, money, custody, or risk consequence;
6. the single most important permitted action;
7. what has changed since the last confirmed event;
8. how to recover when the normal path fails; and
9. whether the displayed information is live, cached, processing, uncertain, or final.

---

## 2. Authority and relationship to other Build Pack documents

The following hierarchy applies:

1. `docs/01-mvp-scope.md` controls what is active, progressive, manual, prohibited, or deferred.
2. `docs/02-user-roles.md` controls who may enter a surface, view a field, initiate an action, approve an action, or receive sensitive information.
3. `docs/03-user-journeys.md` controls required sequences, exception paths, handoffs, evidence, notifications, and honest completion.
4. `docs/04-information-architecture.md` controls surfaces, navigation, routes, pages, content hierarchy, and cross-linking.
5. This document controls design principles, design tokens, component contracts, commerce patterns, interaction states, responsive behaviour, accessibility, and design governance.
6. `docs/06-technical-architecture.md` may define framework, package, rendering, styling, testing, and deployment implementation, but must preserve this contract.
7. `docs/07-domain-model.md` and `docs/08-state-machines.md` will define final entities and machine-readable states. This document remains authoritative for how those states are represented to humans.

A Figma frame, screenshot, code component, template, Codex prompt, pull request, visual preference, or implementation convenience must not:

- activate a deferred capability;
- expose information prohibited by the role contract;
- collapse payment, refund, payout, earnings, order, fulfilment, or custody states;
- show an unresolved provider action as completed;
- imply verification or trust that Noma has not actually established;
- hide required evidence, action consequence, next responsibility, or recovery path;
- use colour as the only status signal;
- remove keyboard, screen-reader, touch, or responsive access;
- make a destructive action easier than the corresponding safe action; or
- replace an established component with an unreviewed one-off variation.

Where this document uses illustrative component names, the technical architecture may adjust code names. The visual semantics, behaviour, accessibility, and product responsibility must remain intact.

---

## 3. Source basis and explicit design inputs

### 3.1 Source-derived direction

The Noma source documents explicitly require a Commerce Pattern Library covering:

- typography;
- spacing;
- grid;
- colours;
- buttons;
- inputs;
- product cards;
- offer cards;
- badges;
- order statuses;
- alerts;
- tables;
- drawers;
- empty states;
- loading states;
- mobile navigation; and
- desktop navigation.

They also require critical design approval before major frontend implementation for:

- homepage and category discovery;
- search and product results;
- product page with seller offers;
- cart and multi-vendor checkout;
- Buyer order tracking and handoff;
- Seller listing and order preparation;
- Rider pickup and delivery; and
- Operations and dispute workflows.

The intended design is:

> **Dense enough for serious commerce, simple enough for students, Nigerian in context, university-native in operation, and recognisably Noma.**

The source documents explicitly reject:

- oversized gradient cards;
- excessive rounded boxes;
- meaningless dashboard statistics;
- giant hero sections;
- excessive empty space;
- default purple AI-style backgrounds;
- animations that slow shopping or operations; and
- low product-information density.

### 3.2 Unsupplied brand inputs

The supplied source documents do **not** lock:

- a final Noma logo;
- a final wordmark construction;
- a permanent brand-primary colour;
- a proprietary font family;
- a complete illustration style; or
- final campaign art direction.

This document therefore distinguishes:

1. **binding structural and semantic design rules**, which are required now; and
2. **an interim Covenant pilot brand layer**, which may later be remapped through named brand tokens without changing semantic status, accessibility, component anatomy, layout, or interaction behaviour.

A future brand decision may change `brand.*` token values after design review. It must not directly replace semantic tokens such as `status.danger`, `status.warning`, `focus.ring`, `text.primary`, or `surface.page` without accessibility and regression review.

---

## 4. Normative language

- **MUST / MUST NOT:** mandatory for the applicable pilot stage.
- **SHOULD / SHOULD NOT:** expected unless an approved, documented reason exists.
- **MAY:** optional within the locked scope.
- **FOUNDATION:** a reusable visual or behavioural primitive such as colour, type, spacing, motion, or elevation.
- **TOKEN:** a named design decision used instead of an unexplained raw value.
- **CORE TOKEN:** a raw scale value such as a neutral shade or spacing increment.
- **SEMANTIC TOKEN:** a context-labelled purpose such as `text.primary` or `status.warning.background`.
- **COMPONENT TOKEN:** a component-specific mapping such as `button.primary.background`.
- **COMPONENT:** a reusable user-interface element with defined anatomy, properties, states, accessibility, and usage rules.
- **PATTERN:** a reusable arrangement of components that solves a recurring Noma user or operational problem.
- **VARIANT:** an approved component form with a distinct, documented purpose.
- **STATE:** a component or business presentation condition such as loading, disabled, processing, failed, or confirmed.
- **DENSITY MODE:** the approved spacing and information-density behaviour for a surface or device context.
- **PROGRESSIVE:** built or architected but exposed only after its activation gate.
- **DEPRECATED:** still present for compatibility but prohibited for new use and scheduled for removal.

---

## 5. Noma design principles

### 5.1 Truth before decoration

Visual emphasis must reflect authoritative state, not marketing preference.

Examples:

- `Payment verifying` must not use the same final-success treatment as `Order confirmed`.
- `Refund approved` must not look like `Refund completed`.
- `Transfer initiated` must not look like `Payout paid`.
- `Rider arrived` must not look like `Delivered`.
- `Seller approved` must not look like `Seller activated`.
- `Covenant affiliation verified` must not imply `Noma Trusted`.

### 5.2 Commerce density without clutter

Noma must show enough information to make a safe purchase or operational decision without forcing users to open several pages.

Density is achieved through:

- disciplined typography;
- short labels;
- consistent alignment;
- compact metadata rows;
- progressive disclosure;
- clear grouping;
- reusable status language; and
- avoidance of redundant decoration.

Density must not become:

- tiny text;
- weak contrast;
- cramped targets;
- unexplained abbreviations;
- hidden actions; or
- desktop tables squeezed onto mobile.

### 5.3 One platform, distinct expressions

All Noma surfaces share tokens, core components, content language, accessibility rules, and status semantics.

They use different compositions:

- **Marketplace:** product-led, image-aware, searchable, comparative, and reassuring.
- **Buyer Account:** progress-led, item-level, plain-language, and recovery-oriented.
- **Seller Centre:** task-led, inventory/order dense, deadline-aware, and operational.
- **Rider PWA:** one-action-at-a-time, touch-first, scan-first, connectivity-aware, and custody-safe.
- **Operations:** queue-led, evidence-rich, filterable, and intervention-oriented.
- **Admin:** configuration-led, review-heavy, comparison-oriented, and deliberately resistant to accidental high-risk action.

### 5.4 Nigerian in context, not stereotyped

Noma should feel local through real product, payment, logistics, network, currency, university, and communication realities—not through decorative clichés.

Examples include:

- Nigerian naira formatting;
- Covenant-approved locations and operating windows;
- Paystack payment language;
- Wi-Fi and intermittent-connectivity recovery;
- familiar marketplace price and promotion conventions;
- clear delivery and pickup expectations; and
- plain English appropriate to students, sellers, riders, and staff.

The design must not rely on flags, maps, patterns, slang, or cultural motifs merely to appear Nigerian.

### 5.5 University-native operation

The interface must reflect:

- institution verification;
- approved campus handoff points;
- student seller and rider contexts;
- laptop/tablet use;
- limited phone availability in the Covenant context;
- operating windows;
- course/book discovery where applicable; and
- controlled campus logistics.

### 5.6 Recognisably Noma, not copied

Noma may learn from established commerce patterns, but it must not reproduce another platform's branding, page composition, naming, icons, or proprietary interaction.

The intended lessons are:

- strong product and fulfilment information density;
- locally understandable promotions and commerce presentation;
- quick listing and product discovery without direct-contact bypass;
- structured condition, trust, and multiple-offer comparison; and
- consistent merchant and operational components.

### 5.7 Accessible by default

Accessibility is a component requirement, not a later audit overlay.

Every component must define:

- semantic HTML or justified ARIA;
- keyboard behaviour;
- visible focus;
- accessible name and description;
- error behaviour;
- colour-independent meaning;
- target size;
- zoom and reflow behaviour;
- reduced-motion behaviour; and
- screen-reader announcement behaviour where state changes asynchronously.

### 5.8 Safe actions are easier than unsafe actions

The interface must make the valid next action clear and make dangerous actions deliberate.

Examples:

- `Prepare order` is primary; `Cancel item` is secondary and consequence-labelled.
- `Confirm pickup` requires the correct parcel credential.
- `Confirm delivery` requires the recipient credential.
- `Submit refund` is distinct from `Mark completed`, which humans must not control.
- `Pause checkout` requires impact review and explicit confirmation.
- `Change payout account` requires recent authentication and beneficiary confirmation.

### 5.9 Calm under failure

Errors, delays, and uncertainty must use calm, specific language. The design must not blame users, overpromise resolution, or create panic through unnecessary visual alarm.

### 5.10 Performance is part of design

Noma must prioritise:

- fast discovery;
- responsive input;
- stable layout;
- optimised product images;
- light interaction code;
- limited animation;
- useful loading structure; and
- graceful behaviour under intermittent connectivity.

---

## 6. Design-system architecture

### 6.1 Required layers

```text
Core values
    ↓
Core tokens
    ↓
Semantic tokens
    ↓
Component tokens
    ↓
Components
    ↓
Commerce patterns
    ↓
Page compositions
    ↓
Surface expressions
```

Raw values must not be scattered through feature code when an applicable token exists.

### 6.2 Token naming

Preferred conceptual naming:

```text
<category>.<role>.<variant>.<state>
```

Examples:

```text
color.text.primary
color.surface.page
color.status.warning.background
spacing.component.md
radius.control.md
shadow.overlay
button.primary.background.hover
productCard.price.text
```

Technical implementation may use CSS custom properties, TypeScript objects, or another generated format, but names must preserve intention.

### 6.3 Modes

The Covenant MVP requires:

- **Light mode:** required and fully tested.
- **High-contrast operating-system compatibility:** required.
- **Reduced motion:** required.
- **Dark mode:** not required for the two-month pilot and must not be exposed as a partial or inconsistent setting.

The token architecture should avoid preventing a later dark mode, but Codex must not implement incomplete dark styling during the MVP unless it replaces work of equal cost through the scope-change process.

### 6.4 Surface density modes

| Density | Primary surfaces | Behaviour |
|---|---|---|
| `comfortable` | Marketplace, Buyer Account | More breathing room, product imagery, readable grouped summaries |
| `compact` | Seller Centre, Operations, Admin | Tighter rows and metadata while preserving target and text requirements |
| `action` | Rider PWA, high-risk confirmations | Large targets, minimal competing content, one dominant next action |

Density is a composition rule. It must not arbitrarily shrink the base font or interactive target below accessibility requirements.

---

## 7. Interim Covenant pilot visual identity

### 7.1 Direction

Until final Noma brand assets are approved, the pilot visual identity uses:

- deep ink/slate as the primary structural brand colour;
- a restrained green accent associated with safe progress and Noma identity;
- white and cool neutral surfaces;
- blue for links and neutral information;
- amber for attention and deadlines;
- red for destructive, failed, unsafe, or blocked states;
- minimal gradients;
- restrained radius;
- thin borders before heavy shadows; and
- product imagery as the primary expressive visual material.

### 7.2 Interim brand rules

- The word `Noma` should use normal title case in product copy unless a final approved wordmark specifies otherwise.
- The logo area must support a text fallback.
- The logo must remain legible at mobile-header size.
- The logo must not be used as the only home link without an accessible name.
- Brand green must not be used as the only signal for verified, safe, successful, or available.
- Promotional art must not obscure product search or urgent operational notices.
- Gradients may be used only in approved campaign art or subtle non-critical backgrounds. They must not become the default card, dashboard, or form treatment.

---

## 8. Colour system

### 8.1 Core neutral palette

| Token | Value | Intended use |
|---|---:|---|
| `neutral.0` | `#FFFFFF` | elevated surfaces, cards, input backgrounds |
| `neutral.25` | `#FCFCFD` | subtle elevated background |
| `neutral.50` | `#F8FAFC` | page background |
| `neutral.100` | `#F1F5F9` | secondary surface, selected row |
| `neutral.200` | `#E2E8F0` | default border/divider |
| `neutral.300` | `#CBD5E1` | strong border, disabled control border |
| `neutral.400` | `#94A3B8` | muted icon, placeholder where permitted |
| `neutral.500` | `#64748B` | secondary text on white |
| `neutral.600` | `#475569` | strong secondary text |
| `neutral.700` | `#334155` | body emphasis |
| `neutral.800` | `#1E293B` | headings, dark controls |
| `neutral.900` | `#0F172A` | primary text, structural brand ink |
| `neutral.950` | `#020617` | maximum contrast/scrim support |

### 8.2 Interim brand palette

| Token | Value | Intended use |
|---|---:|---|
| `brand.50` | `#F0FDF4` | subtle brand surface |
| `brand.100` | `#DCFCE7` | selected/supporting brand surface |
| `brand.200` | `#BBF7D0` | decorative border only with contrast review |
| `brand.500` | `#16A34A` | non-text accent, charts where labelled |
| `brand.600` | `#15803D` | accent control on white where contrast passes |
| `brand.700` | `#166534` | accessible brand control background |
| `brand.800` | `#14532D` | pressed/dark brand background |
| `brand.900` | `#052E16` | deepest brand ink |

The primary button for the pilot should use structural ink (`neutral.900`) rather than relying on status-like green. Brand green may support selected, active, progress, Noma-owned fulfilment, or campaign accents where text and meaning remain explicit.

### 8.3 Functional palettes

| Role | Strong | Default | Subtle background | Border |
|---|---:|---:|---:|---:|
| Information/link | `#1E3A8A` | `#1D4ED8` | `#EFF6FF` | `#BFDBFE` |
| Success/confirmed | `#14532D` | `#15803D` | `#F0FDF4` | `#BBF7D0` |
| Warning/attention | `#78350F` | `#B45309` | `#FFFBEB` | `#FDE68A` |
| Danger/failed | `#7F1D1D` | `#B91C1C` | `#FEF2F2` | `#FECACA` |
| Processing/uncertain | `#3730A3` | `#4F46E5` | `#EEF2FF` | `#C7D2FE` |

### 8.4 Semantic colour tokens

Required semantic tokens include:

```text
color.text.primary
color.text.secondary
color.text.muted
color.text.inverse
color.text.link
color.text.disabled

color.surface.page
color.surface.primary
color.surface.secondary
color.surface.elevated
color.surface.selected
color.surface.disabled
color.surface.scrim

color.border.default
color.border.strong
color.border.focus
color.border.disabled

color.action.primary.background
color.action.primary.foreground
color.action.secondary.background
color.action.danger.background

color.status.info.*
color.status.success.*
color.status.warning.*
color.status.danger.*
color.status.processing.*
```

### 8.5 Contrast requirements

Noma targets WCAG 2.2 Level AA for the pilot.

At minimum:

- normal text must meet `4.5:1` contrast;
- large text must meet `3:1` contrast;
- meaningful icons, input borders, focus indicators, and graphical controls must meet applicable non-text contrast requirements;
- disabled content may use reduced contrast only when it is truly unavailable and still understandable;
- placeholder text must not carry required instructions;
- text over images requires a tested solid backing, scrim, or alternate composition;
- status colours must be paired with text, icon, shape, or position; and
- charts must provide labels, patterns, or accessible data alternatives.

### 8.6 Colour prohibitions

- Do not introduce arbitrary hex values in page code when a semantic token exists.
- Do not use green to mean both `available` and `money paid` without distinct labels.
- Do not use red for ordinary neutral cancellation history.
- Do not use yellow text on white.
- Do not use light-grey text for required product, price, deadline, or status information.
- Do not encode seller standing as colour alone.
- Do not use a decorative rainbow of dashboard card colours.

---

## 9. Typography

### 9.1 Font family

Interim pilot stack:

```css
font-family: Inter, Geist, ui-sans-serif, system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Implementation should use one primary sans-serif family and reliable system fallbacks. A final licensed or proprietary font is not required for the pilot.

### 9.2 Type scale

| Token | Size / line height | Weight | Typical use |
|---|---|---:|---|
| `display.lg` | `40 / 48` | 700 | rare campaign headline; not routine dashboard use |
| `display.md` | `32 / 40` | 700 | Marketplace page hero/title on wide screens |
| `heading.xl` | `28 / 36` | 700 | primary page title |
| `heading.lg` | `24 / 32` | 700 | major section/detail title |
| `heading.md` | `20 / 28` | 650/700 | card/section heading |
| `heading.sm` | `18 / 26` | 600/650 | compact section heading |
| `body.lg` | `18 / 28` | 400 | lead/help text |
| `body.md` | `16 / 24` | 400 | default body/input text |
| `body.sm` | `14 / 20` | 400 | metadata, table support text |
| `label.md` | `14 / 20` | 600 | control label, status label |
| `label.sm` | `12 / 16` | 600 | compact badge/eyebrow, never main body |
| `numeric.price.lg` | `24 / 30` | 700 | product/checkout primary price |
| `numeric.price.md` | `18 / 24` | 700 | product card/offer price |
| `numeric.tabular` | contextual | 500/600 | finance, quantity, time, queue values |

### 9.3 Typography rules

- Default body and form text must not be smaller than `16px` on mobile where browser zoom/input behaviour may be affected.
- `12px` is limited to non-critical compact labels with strong contrast.
- Price, total, refund, payout, and deadline values must use tabular numerals where supported.
- Headings must follow semantic order, not visual size alone.
- Do not use all caps for sentences, errors, or long labels.
- All caps may be used sparingly for short internal identifiers or category eyebrows, with letter spacing and an accessible name.
- Do not truncate critical money, status, condition, promise, or safety information without an accessible full value.
- Product titles may clamp in cards, but the complete title must be available on the detail page and to assistive technology where appropriate.
- Long references should wrap or use copy controls; they must not break mobile layout.

### 9.4 Content width

- Long policy/help prose should target approximately `60–75` characters per line.
- Marketplace, queue, and detail layouts may be wider because their content is structured rather than continuous prose.
- Dense staff tables must not force explanatory paragraphs into narrow columns.

---

## 10. Spacing and sizing

### 10.1 Base spacing scale

Noma uses a `4px` base unit.

| Token | Value |
|---|---:|
| `space.0` | `0` |
| `space.1` | `4px` |
| `space.2` | `8px` |
| `space.3` | `12px` |
| `space.4` | `16px` |
| `space.5` | `20px` |
| `space.6` | `24px` |
| `space.8` | `32px` |
| `space.10` | `40px` |
| `space.12` | `48px` |
| `space.16` | `64px` |
| `space.20` | `80px` |

### 10.2 Common spacing assignments

| Use | Comfortable | Compact | Action |
|---|---:|---:|---:|
| Control vertical padding | `10–12px` | `8–10px` | `12–16px` |
| Card padding | `16–24px` | `12–16px` | `16–24px` |
| Section gap | `24–40px` | `16–24px` | `20–32px` |
| Row height | `48–64px` | `40–52px` | `56–72px` |
| Inline metadata gap | `8–12px` | `6–8px` | `12px` |

### 10.3 Interactive target sizes

- Noma's default touch target should be at least `44 × 44px`.
- Compact desktop controls may have a smaller visual box only when the clickable target remains sufficiently large and spacing prevents accidental activation.
- Rider primary actions and scan controls should target at least `48 × 48px`, preferably larger.
- Icon-only controls must provide an accessible name and must not rely on a `16px` icon as the complete hit area.
- Closely spaced destructive and safe actions require additional separation.

---

## 11. Grid, containers, and breakpoints

### 11.1 Responsive breakpoints

Breakpoints are content-driven implementation references, not device-brand assumptions.

| Token | Minimum width | Typical use |
|---|---:|---|
| `bp.xs` | `0px` | narrow mobile |
| `bp.sm` | `480px` | wide mobile |
| `bp.md` | `768px` | tablet/portrait |
| `bp.lg` | `1024px` | laptop/tablet landscape |
| `bp.xl` | `1280px` | desktop |
| `bp.2xl` | `1440px` | wide operational workspace |

### 11.2 Page gutters

| Viewport | Minimum gutter |
|---|---:|
| `<480px` | `16px` |
| `480–767px` | `20px` |
| `768–1023px` | `24px` |
| `1024–1279px` | `32px` |
| `≥1280px` | `40px` where composition permits |

### 11.3 Container widths

| Context | Suggested maximum |
|---|---:|
| Policy/help prose | `760px` |
| Authentication/verification | `520–640px` |
| Product/checkout/account | `1200–1280px` |
| Seller Centre | `1280–1440px` |
| Operations/Admin | `1440–1600px` or fluid with controlled columns |
| Rider | fluid, optimised for supported tablet width |

### 11.4 Column behaviour

- Marketplace grids may use `2` columns on narrow mobile only when card content remains readable; otherwise use one column.
- Product results should progress to `3–5` columns according to available width and minimum card width.
- Product detail should move from stacked mobile to media/details/offer composition on wider screens.
- Checkout should remain one focused reading order on mobile and may use a sticky order summary on desktop.
- Seller, Operations, and Admin may use sidebar + content + contextual panel only when the authoritative detail remains visible and keyboard order remains logical.
- No essential control may be reachable only through horizontal page scrolling.

---

## 12. Shape, border, shadow, and elevation

### 12.1 Radius scale

| Token | Value | Use |
|---|---:|---|
| `radius.none` | `0` | tables/dividers where appropriate |
| `radius.sm` | `4px` | tags, compact controls |
| `radius.md` | `8px` | inputs, buttons, cards |
| `radius.lg` | `12px` | dialogs, major panels |
| `radius.full` | `999px` | badges, avatars, not general cards |

Noma must avoid making every container pill-shaped or heavily rounded.

### 12.2 Border scale

| Token | Value |
|---|---:|
| `border.thin` | `1px` |
| `border.strong` | `2px` |
| `border.focus` | `2–3px` visible ring/outline according to component |

Borders should carry most everyday separation. Shadows are reserved for overlays, sticky elements, and genuine elevation.

### 12.3 Shadow scale

| Token | Intent |
|---|---|
| `shadow.none` | default flat page structures |
| `shadow.sm` | subtle floating control/sticky header |
| `shadow.md` | dropdown, popover, raised card where needed |
| `shadow.lg` | modal/dialog/sheet |

Heavy diffuse shadows, glassmorphism, and glowing borders are prohibited as default styling.

---

## 13. Iconography

- Use one consistent outlined icon family for standard actions and navigation.
- Use filled icons only for selected state or strong status emphasis.
- Default icon sizes: `16px`, `20px`, and `24px`.
- Rider and scan-critical icons may use `24–32px`.
- Icons must not replace text for unfamiliar, financial, custody, enforcement, or destructive actions.
- Icon-only buttons require an accessible name and tooltip where useful.
- Status icons must be paired with text.
- Do not use emojis as production status icons.
- Do not invent a unique icon for every internal state where a clear label is more reliable.

---

## 14. Product imagery, evidence imagery, and illustrations

### 14.1 Product imagery

Product imagery should:

- use neutral, uncluttered backgrounds where appropriate;
- preserve truthful colour, condition, included items, and scale;
- use consistent aspect ratios within a result grid;
- avoid aggressive crops that hide material product details;
- load responsive sizes;
- provide useful alternative text where the image conveys product information; and
- reserve layout space to prevent shifts.

### 14.2 Pre-owned imagery

Pre-owned offers must visually distinguish actual-unit evidence from catalogue imagery.

Required treatment:

- label `Actual item shown`;
- show actual-unit photograph count;
- surface known defects near the gallery/condition summary;
- preserve defect close-ups;
- avoid AI edits that remove wear, scratches, stains, missing items, or other material facts; and
- never display `Noma Verified Pre-Owned` without the required inspection state.

### 14.3 Evidence imagery

Dispute, return, identity, and safety evidence must use a private evidence viewer with:

- actor and upload time;
- evidence type;
- safe filename/display label;
- access controls;
- zoom/rotate where required;
- download permission only where authorised;
- no public image URL; and
- clear distinction between submitted evidence and Noma/system evidence.

### 14.4 Illustrations

Illustrations may support:

- empty states;
- onboarding;
- campaign collections;
- educational safety content; and
- launch storytelling.

They must not replace:

- product images;
- status text;
- operational evidence;
- real delivery-point instructions; or
- a useful call to action.

Generic robots, floating AI brains, futuristic neon scenes, and decorative pseudo-3D dashboards are not part of Noma's default design language.

---

## 15. Motion and feedback

### 15.1 Motion principles

Motion must explain change, not decorate routine interaction.

Approved uses include:

- menu/sheet entry;
- accordion disclosure;
- item removal/reordering feedback;
- step progress;
- lightweight status transition;
- skeleton-to-content fade; and
- confirmation emphasis.

### 15.2 Timing

| Motion | Typical duration |
|---|---:|
| Micro state change | `100–160ms` |
| Menu/popover | `120–180ms` |
| Sheet/dialog | `180–240ms` |
| Page-level transition | avoid unless necessary; generally `<300ms` |

### 15.3 Motion restrictions

- Respect `prefers-reduced-motion`.
- Avoid autoplay carousels for critical product discovery.
- Avoid parallax, background video, and animated gradients in commerce-critical views.
- Do not animate changing totals in a way that obscures the final amount.
- Do not move a focused control unexpectedly.
- Loading animation must not imply progress that is not known.
- Payment, refund, payout, and reconciliation pages must prioritise stable text over celebratory animation.

---

## 16. Language, content, and microcopy

### 16.1 Voice

Noma's product voice should be:

- clear;
- calm;
- direct;
- respectful;
- specific;
- locally understandable;
- confident without overpromising; and
- human without becoming informal in serious contexts.

### 16.2 Action labels

Use verb + object or explicit consequence:

```text
Add to cart
Compare offers
Continue to payment
Prepare order
Mark ready for pickup
Scan parcel QR
Confirm handoff
Cancel item
Request return
Submit evidence
Approve refund
Hold affected earnings
Pause seller
Pause checkout
```

Avoid:

```text
Proceed
Process
Resolve
Disable
Okay
Yes
Submit     [where the consequence is unclear]
```

### 16.3 Status copy pattern

A material status should use:

```text
Status label
Short explanation of what was confirmed
Who acts next / whether action is required
Date, time, deadline, or reference where useful
```

Example:

```text
Refund processing
Your ₦12,200 refund was submitted to the payment provider on 30 July.
No action is required from you. We will notify you when the provider confirms completion.
```

### 16.4 Error copy pattern

```text
What happened
What was preserved
What the user can do now
How to get help / stable reference
```

Example:

```text
We are still checking your payment
Do not pay again yet. Your payment reference NM-PAY-48291 is under verification.
You can leave this page and return from Orders. We will notify you when the result is confirmed.
```

### 16.5 Currency and numbers

- Display Nigerian naira as `₦12,500` or `₦12,500.00` according to context.
- Use two decimal places in financial reconciliation/ledger contexts when needed.
- Do not display kobo-level raw integers to users.
- Align monetary columns and use tabular numerals.
- Show negative amounts with both sign and meaning where possible, such as `−₦2,000 Refund reversal`.
- Do not rely only on red/green for positive/negative values.
- Use locale-aware separators.

### 16.6 Dates and times

- Use unambiguous dates such as `30 Jul 2026` in compact UI and `30 July 2026` in detail/help contexts.
- Use local Covenant/Nigeria time and show timezone where ambiguity matters.
- Relative time may supplement but not replace exact time for money, custody, deadlines, appeals, or audit.
- Countdown urgency must include the exact deadline.

### 16.7 Trust language

The following labels are distinct:

```text
Covenant affiliation verified
Seller approved
Seller active at Covenant
Payout account verified
Verified purchase
Actual item shown
Inspected by Noma / approved partner
Noma Trusted      [only when later earned under approved policy]
```

A generic `Verified` badge without a defined subject is prohibited.

---

## 17. Universal component state model

Every interactive component must define applicable states:

```text
default
hover
focus-visible
active/pressed
selected
loading
processing
success/confirmed
warning
error/failed
disabled
read-only
expired
stale/conflict
offline/cached
restricted/out-of-scope
```

### 17.1 Disabled versus unavailable

- **Disabled:** the action exists but cannot currently be used; explain why when material.
- **Unavailable:** the feature or capability is not active or not permitted; use a distinct unavailable state or remove it from ordinary navigation according to IA rules.
- Do not leave a button disabled with no explanation when the user reasonably expects to act.

### 17.2 Loading versus processing

- **Loading:** Noma is fetching or rendering existing information.
- **Processing:** Noma or a provider is performing an accepted action.

A processing action must preserve a stable reference and must not invite unsafe duplicate submission.

### 17.3 Optimistic updates

Optimistic UI may be used only where reversal is harmless and understandable, such as:

- saving a preference;
- marking a notification read;
- updating a low-risk draft field.

Do not optimistically display final success for:

- payment;
- refund;
- payout;
- seller earning release;
- stock reservation where confirmation is uncertain;
- pickup;
- delivery;
- role grant;
- suspension;
- high-risk configuration; or
- evidence upload before server confirmation.

---

# Part A — Foundational components

## 18. Buttons and action controls

### 18.1 Button variants

| Variant | Purpose | Examples |
|---|---|---|
| `primary` | one dominant safe action in the current context | Add to cart, Continue, Prepare order |
| `secondary` | important alternative | Save draft, Compare, View details |
| `tertiary` | low-emphasis inline action | Edit, Change, Clear filters |
| `danger` | destructive/restrictive action | Cancel item, Remove listing, Pause seller |
| `success` | rare confirmation action where semantics are clear | Confirm received evidence; not general success styling |
| `link` | navigation presented as text | View policy, Open order |
| `icon` | familiar compact action with accessible name | Close, more actions, copy |

### 18.2 Button rules

- One primary button per decision region.
- Two primary buttons must not compete within the same panel.
- Destructive actions must not be visually adjacent to the primary safe action without separation.
- Loading buttons preserve width and label context, such as `Submitting refund…`.
- A processing button must prevent duplicate activation but preserve page navigation where safe.
- Disabled buttons require an explanatory hint where the reason is not obvious.
- Button labels must not change meaning solely through colour or icon.
- `Cancel` as dialog dismissal must not be confused with `Cancel order`.

### 18.3 Split and menu buttons

Use only where:

- one action is clearly the default;
- alternate actions are closely related;
- the default remains safe; and
- keyboard and screen-reader behaviour is fully implemented.

Do not use a split button for high-risk Finance, enforcement, access, or emergency actions.

---

## 19. Links

- Links navigate; buttons perform actions.
- Link text must describe the destination.
- External links must be identified where leaving Noma matters.
- Do not use `Click here`.
- Links within dense tables require sufficient target area.
- Visited styling may be used for public informational browsing but should not accidentally reveal sensitive history on shared devices.
- Deep links to private resources must pass authentication and authorization without exposing record existence.

---

## 20. Form controls

### 20.1 Required controls

The design system must include:

- text field;
- email field;
- password field;
- phone field;
- number/currency field;
- textarea;
- select/combobox;
- checkbox;
- radio group;
- switch;
- segmented control;
- date/time input where required;
- quantity stepper;
- file/image uploader;
- OTP/PIN input;
- search field; and
- category/attribute editor patterns.

### 20.2 Field anatomy

```text
Label
Optional/required indicator where useful
Input/control
Supporting instruction
Validation/error message
Character/unit/format helper where applicable
```

### 20.3 Field rules

- Labels must remain visible; placeholder-only labels are prohibited.
- Required fields must be identified consistently.
- Error text must explain correction, not merely state `Invalid`.
- Validation should occur at appropriate times and again server-side.
- Do not clear user input after recoverable failure.
- Sensitive fields must explain why information is requested and how it is used.
- Masked values must not imply the underlying value is editable or fully visible.
- Paste must be allowed for passwords, OTPs, account numbers, and other fields unless a documented security reason overrides it.
- Accessible password managers and autofill must not be blocked.
- Input formatting must not make correction difficult.

### 20.4 Error summary

Long forms and wizards must show an error summary that:

- receives focus when submission fails;
- identifies the number and nature of errors;
- links to the affected fields;
- preserves entered values; and
- distinguishes validation errors from service/provider failure.

---

## 21. Search, autocomplete, filters, and sorting

### 21.1 Search field

The Marketplace search field is a primary navigation component.

It must support:

- explicit label or accessible name;
- clear submit behaviour;
- clear button;
- recent/popular suggestions where permitted;
- product/category/brand suggestion labelling;
- typo/correction suggestion;
- keyboard navigation;
- screen-reader result count and selection state; and
- no private cross-user history exposure.

### 21.2 Autocomplete

Autocomplete must:

- distinguish query suggestions from exact products/categories;
- not change route merely on focus;
- support arrow keys, Enter, Escape, and Tab predictably;
- not trap focus;
- announce result updates without excessive speech; and
- retain the typed query when dismissed.

### 21.3 Filters

Desktop may use a persistent filter rail where space permits. Mobile uses an accessible sheet/drawer.

The pattern must include:

- filter group title;
- active count;
- selected values;
- clear per group;
- clear all;
- result count;
- apply behaviour on mobile where required;
- category-specific attributes only; and
- no hidden default that materially alters price, condition, or availability.

### 21.4 Sorting

Approved sorts may include:

- relevance;
- price low to high;
- price high to low;
- delivery/availability where supported;
- newest where appropriate; and
- rating only when data quality supports it.

Sponsored placement must not masquerade as an organic sort.

---

## 22. Navigation components

Required components:

- public desktop header;
- public mobile header;
- mobile bottom navigation;
- account/surface switcher;
- Seller/Operations/Admin sidebar;
- Rider top/status bar;
- breadcrumbs;
- tabs;
- contextual sub-navigation;
- pagination; and
- notification centre entry.

Navigation must:

- expose only active memberships and feature-gated destinations;
- show current location;
- remain keyboard operable;
- provide a skip link;
- avoid hover-only access;
- preserve surface context in notifications/deep links; and
- remove revoked privileged navigation immediately while server-side denial remains authoritative.

---

## 23. Status, badges, chips, and signals

### 23.1 Status badge anatomy

```text
Optional icon
Short status label
Optional supporting explanation outside the badge
```

Badge text should be short. Long status meaning belongs in adjacent body text or a status panel.

### 23.2 Badge categories

| Category | Examples | Rules |
|---|---|---|
| Object state | Processing, Ready, Delivered, Failed | map to state machine meaning |
| Eligibility | Covenant verified, Invite only | identify the subject |
| Commerce | Pre-owned, Food, FBN | no implied quality guarantee |
| Fulfilment | Delivered today, External inbound | pair with promise detail |
| Risk/attention | Action required, Under review | do not expose private risk reason publicly |
| Advertising | Sponsored | always explicit when later activated |

### 23.3 Badge prohibitions

- No generic blue tick.
- No `Verified seller` when only email or payout account is verified.
- No `Guaranteed delivery` where only an estimate exists.
- No `Noma Verified Pre-Owned` without exact-unit inspection.
- No success colour for a temporary hold or uncertain state.
- No badge wall that overwhelms title, price, condition, or promise.

---

## 24. Alerts, banners, notices, and toasts

### 24.1 Alert levels

| Level | Use |
|---|---|
| `info` | neutral explanation, changed process |
| `success` | confirmed completion |
| `warning` | deadline, risk, changed promise, action required |
| `danger` | blocked, failed, unsafe, destructive consequence |
| `processing` | accepted but not final |

### 24.2 Persistent versus transient

Use persistent inline/banner notice for:

- money/custody uncertainty;
- operational pause;
- action-required deadline;
- seller restriction;
- changed delivery promise;
- security concern;
- failed evidence upload; or
- provider reconciliation.

Use toast/snackbar for:

- low-risk preference saved;
- copied reference;
- item added to cart where cart state remains available;
- notification marked read.

A toast must not be the only record of a payment, refund, payout, role, suspension, or custody result.

### 24.3 Banner rules

- One highest-priority banner per page region where possible.
- Multiple operational notices should be ordered by severity and action deadline.
- Dismissal is allowed only when the message is genuinely optional or remains accessible elsewhere.
- Emergency/paused-state banners must not be dismissible by ordinary users.

---

## 25. Cards and tiles

### 25.1 Card principles

Cards are for grouped objects, not for every paragraph.

A card must have:

- a clear object or decision boundary;
- consistent anatomy;
- one primary navigation or action target;
- defined responsive behaviour; and
- a reason to be visually separated.

### 25.2 Product card

Required priority:

1. product image;
2. product title;
3. condition where material;
4. primary/current price or price range;
5. availability;
6. delivery/fulfilment promise;
7. seller-offer count or selected offer context;
8. rating only where eligible; and
9. promotion/sponsored label where applicable.

Rules:

- Do not hide condition or external-inbound promise below the fold of the card when material.
- Do not show five duplicate cards for materially identical offers when canonical grouping applies.
- Do not use excessive badges.
- Do not place tiny `Add` controls where offer/variant selection is still required.

### 25.3 Offer card/row

Required content:

- seller identity/public store label;
- exact price;
- condition;
- stock/availability;
- fulfilment source;
- delivery promise and cost;
- warranty/return summary;
- applicable seller standing signal with subject identified;
- primary action; and
- comparison selection.

The lowest price must not automatically receive misleading visual dominance if total delivery, condition, warranty, or reliability differs.

### 25.4 Seller card

May show:

- approved public seller name;
- seller type;
- active categories;
- eligible public performance signals;
- delivery/fulfilment context; and
- store link.

Must not show:

- owner private identity;
- payout information;
- internal risk score;
- unrelated cases; or
- private Covenant location.

### 25.5 Delivery-tier card

Must show:

- tier name;
- price;
- promise/window;
- batching/urgency meaning;
- current capacity/availability;
- material limitations; and
- selection state.

Priority must not be represented as guaranteed where capacity/policy does not support a guarantee.

### 25.6 Order/item card

Must preserve item-level status and may group by seller or fulfilment context. It must not allow one cancelled item to visually mark the whole Parent Order cancelled.

### 25.7 Metric card

A metric card is allowed only when it supports a decision and links to its underlying records.

Every metric card must include:

- metric label;
- value;
- period/scope;
- comparison definition where shown;
- freshness; and
- link to the relevant queue/report.

Decorative `Total users`, unsupported growth percentages, and meaningless celebratory metrics are prohibited.

---

## 26. Tables, lists, and operational queues

### 26.1 Table requirements

Tables must provide:

- caption or accessible purpose;
- clear column headers;
- scope and freshness;
- sortable columns only where sorting is meaningful;
- row focus/selection;
- keyboard-accessible row actions;
- status text, not colour alone;
- horizontal overflow strategy where unavoidable;
- responsive alternative for mobile; and
- empty/error/loading states.

### 26.2 Queue row priority

A queue row should surface:

1. object/reference;
2. current state;
3. required next action;
4. deadline/age;
5. severity or promise risk;
6. responsible queue/owner;
7. value/exposure where authorised; and
8. row action or link.

### 26.3 Bulk actions

Bulk actions require:

- explicit selection count;
- eligibility validation per record;
- preview of affected/blocked records;
- consequence summary;
- reason where material;
- confirmation; and
- result report.

Bulk refund, payout, role, suspension, custody, or emergency actions must obey separation-of-duty and must not be introduced merely because a checkbox table exists.

### 26.4 Mobile table alternative

On narrow screens, convert rows to structured record cards with:

- label/value pairs;
- primary status;
- deadline;
- main action; and
- expandable secondary details.

Do not hide critical columns without an alternative.

---

## 27. Timeline and history

Timeline entries must identify:

- event label;
- actor type: Buyer, Seller, Rider, Staff, System, Provider;
- confirmed date/time;
- pending/confirmed/failed/superseded state;
- safe description;
- evidence or related object where authorised;
- correction/reversal relationship; and
- current relevance.

System/provider events must be visually distinguishable from user statements.

A timeline must not:

- allow editing of historical system events;
- hide reversals;
- treat a staff note as provider truth;
- expose internal details to the wrong actor; or
- use identical icons for all event types without labels.

---

## 28. Dialogs, drawers, sheets, popovers, and tooltips

### 28.1 Dialogs

Use for:

- focused confirmation;
- short high-impact decision;
- reauthentication;
- concise evidence/action review.

Do not use a modal as the only home for a long-lived case, order, payout, or enforcement record.

### 28.2 Drawers/sheets

Use for:

- mobile filters;
- cart preview;
- quick object preview;
- secondary editing;
- non-destructive contextual action.

A sheet must preserve focus, support Escape/back, and return focus to the invoking control.

### 28.3 Popovers/tooltips

- Tooltips supplement labels; they do not replace essential labels.
- Popovers must be keyboard operable and dismissible.
- Hover-only content is prohibited.
- Do not hide material price, condition, promise, or warning information inside a tooltip.

---

## 29. Empty, loading, stale, error, unavailable, and offline states

### 29.1 Empty state anatomy

```text
Clear title
Why the area is empty
Whether filters/state caused it
Useful next action
Help route if unexpected
Optional restrained illustration
```

Examples:

- Seller no orders: explain readiness and link to listings.
- Search no results: suggest spelling/category/filter recovery without inventing products.
- Rider no jobs: show shift/availability and refresh/connectivity state.
- Buyer no cases: preserve `Get help with an order` path.

### 29.2 Loading states

- Preserve expected page structure.
- Use skeletons for content with a predictable layout.
- Use a spinner for a small indeterminate action, not the whole page indefinitely.
- Prevent layout shift.
- Do not display skeleton text as if it were real data to assistive technology.
- After a reasonable timeout, switch to a safe retry/processing/error explanation.

### 29.3 Stale/conflict state

When the underlying record changed:

- stop unsafe submission;
- explain what changed;
- preserve the user's draft where safe;
- reload authoritative data;
- show comparison where material; and
- require reconfirmation for changed money, stock, custody, or consequence.

### 29.4 Provider uncertainty

For payment/refund/payout uncertainty:

- use `processing`/`under reconciliation`, not failure or success;
- display the stable reference;
- show last confirmed event/time;
- disable unsafe duplicate action;
- provide ownership and notification expectation; and
- preserve navigation away and return.

### 29.5 Feature unavailable

Use accurate reason categories:

```text
Not available at Covenant yet
Invite-only
Capacity full
Temporarily paused
Seller/category not eligible
Access not authorised
```

Do not disclose internal risk or enforcement reasons to unauthorised actors.

### 29.6 Offline/cached state

Rider and selected resumable workflows must clearly distinguish:

```text
Live / server-confirmed
Cached as of <time>
Draft saved on this device
Waiting to sync
Sync failed
Conflict — assignment changed
```

A cached assignment must not visually appear live without a timestamp and connectivity indicator.

---

## 30. Progress, steps, and completion

### 30.1 Stepper

Use for multi-stage processes such as:

- Covenant verification;
- Seller onboarding;
- listing creation;
- checkout;
- return/case evidence;
- payout-account change; and
- FBN inbound where activated.

A stepper must show:

- current step;
- completed steps;
- remaining steps;
- optional/required status where relevant;
- save/resume state; and
- errors requiring return.

### 30.2 Progress versus status

A visual progress bar is appropriate only when progress is measurable.

Do not show an arbitrary `80% complete` for:

- payment verification;
- refund provider processing;
- dispute review;
- payout transfer; or
- identity manual review.

Use milestone/status timelines instead.

### 30.3 Success treatment

Success screens must be reserved for genuinely completed outcomes. They should include:

- confirmed result;
- reference;
- next expected step;
- destination/action; and
- no misleading confetti for serious financial or enforcement events.

---

## 31. File and image upload component

The upload pattern must include:

- allowed types and size/count limits before selection;
- drag/drop plus standard file picker;
- camera capture where appropriate;
- preview;
- upload progress;
- server-confirmed completion;
- retry/remove;
- accessible status announcements;
- per-file error;
- privacy/usage explanation for sensitive evidence; and
- category-specific photo requirements.

Product image upload should support ordered media and required-angle guidance.

Evidence upload must not expose a public URL or allow an ordinary user to attach files to an unrelated case/order.

---

## 32. QR, barcode, PIN, and scanning pattern

### 32.1 Scan state sequence

```text
Ready to scan
Camera permission/help
Code detected
Validating with server
Confirmed
Wrong/expired/already used
Offline draft not permitted / controlled fallback
```

### 32.2 Requirements

- Provide manual code entry fallback where policy permits.
- Do not rely on camera access as the only accessible path.
- Show what object is expected before scanning.
- On mismatch, show expected versus scanned item safely.
- Require confirmation where a scan changes custody.
- Prevent duplicate pickup/handoff.
- Announce result through text, icon, sound/haptic where supported, and screen-reader update.
- Do not show full recipient PIN in advance to the rider.
- Preserve proof and timestamp after server confirmation.

### 32.3 Rider visual priority

At pickup/handoff, the Rider surface should show:

1. current custody state;
2. expected parcel/recipient action;
3. dominant scan/verify control;
4. location/instruction;
5. handling warning;
6. connectivity state; and
7. incident/escalation path.

---

# Part B — Noma commerce patterns

## 33. Marketplace homepage and category discovery

The homepage must prioritise:

1. search;
2. active institution/service context;
3. high-value categories;
4. relevant collections/campaigns;
5. useful availability/fulfilment context;
6. product discovery; and
7. trust/help information.

The hero must not dominate the first viewport at the expense of search and products.

Approved patterns:

- compact campaign banner;
- category strip/grid;
- curated product rail;
- recently viewed where privacy-safe;
- exam/term essentials;
- active Food entry only after activation;
- clear seller/store collection.

Prohibited patterns:

- giant abstract gradient hero;
- fake countdown urgency;
- auto-rotating inaccessible carousel;
- unsupported `50% off` claims;
- campaign art that looks like a system alert.

---

## 34. Search results and product listing

The search results page must preserve:

- query and result count;
- correction/synonym information;
- category and active filters;
- sort;
- canonical product grouping;
- item-specific pre-owned distinction;
- availability;
- condition;
- delivery promise;
- price/price range; and
- zero-result recovery.

Result cards must remain comparable. Promotional content must not break the grid so frequently that comparison becomes difficult.

Sponsored results, when later activated, require persistent `Sponsored` labelling and must remain relevant.

---

## 35. Product detail and seller-offer comparison

### 35.1 Product-detail composition

Required content priority:

1. canonical product identity;
2. media/actual-unit evidence;
3. title, brand/model, and key attributes;
4. condition where applicable;
5. selected offer and exact price;
6. availability and reservation context;
7. delivery source, cost, and promise;
8. seller identity and relevant standing;
9. primary purchase action;
10. alternate offers/comparison;
11. warranty/returns/protection;
12. specifications and description;
13. reviews; and
14. report/help.

### 35.2 Offer selector

Offer comparison should support at minimum:

- price;
- condition;
- seller;
- fulfilment source;
- delivery cost/promise;
- stock;
- warranty/return summary; and
- included items.

The interface should identify why an offer is recommended, such as `Fastest delivery` or `Lowest total`, rather than claiming an unexplained `Best`.

### 35.3 Sticky purchase action

On mobile, a sticky purchase action may show selected price and Add to cart. It must not cover:

- active error;
- condition warning;
- keyboard/input;
- consent; or
- navigation required to complete variant selection.

---

## 36. Product price and promotion pattern

Every price presentation must distinguish:

- current selling price;
- previous/reference price only where genuine;
- discount amount/percentage where supported;
- delivery cost or `calculated at checkout` where truthful;
- coupon effect;
- total landed cost at checkout; and
- promotion funding internally where authorised.

Rules:

- Do not fabricate crossed-out prices.
- Do not use `Free delivery` if another mandatory fee replaces it.
- Show coupon eligibility and expiry clearly.
- At checkout, show item subtotal, discounts, delivery, and total.
- When a price changes, require revalidation and clear confirmation.
- Personalised pricing is deferred and must not appear.

---

## 37. Availability, stock, and delivery promise pattern

### 37.1 Availability language

Approved examples:

```text
In stock
Only 2 available
Availability confirmed at checkout
Temporarily unavailable
Seller confirmation required
Outlet opens at 12:00
External inbound: estimated 2–4 working days
```

Do not show false urgency based on invented stock.

### 37.2 Promise anatomy

```text
Promise/window
Fulfilment source
Delivery tier
Condition or dependency
Updated versus original promise where changed
```

Examples:

```text
Standard delivery today, 4:00–6:00 PM
From Covenant Bookstore via CU Express
```

```text
External inbound estimate: 2–4 working days
Campus handoff begins after Noma receives the item
```

An updated ETA must not erase the original committed promise in order history/Operations.

---

## 38. Cart and multi-vendor grouping

The cart is a review and recovery pattern, not a promise of final availability.

Required composition:

- items grouped by seller or understandable fulfilment context;
- offer/variant/condition;
- quantity;
- current price;
- item eligibility/error;
- expected fulfilment grouping;
- delivery estimate;
- subtotal/discount/total estimate;
- remove/save/update; and
- checkout gate.

When one item becomes invalid:

- preserve unaffected items;
- identify the exact problem;
- offer remove/change where permitted;
- never silently substitute seller, variant, or condition; and
- recalculate totals visibly.

---

## 39. Checkout pattern

Checkout is focused and reduces unrelated navigation.

Required stages:

```text
Review identity/eligibility
Delivery point and recipient/delegate
Fulfilment groups and tier
Items and sellers
Price/discount/delivery total
Policy/consent
Paystack payment initiation
Provider return and verification
```

Design rules:

- Show one primary action per step.
- Preserve edit links.
- Revalidate before payment.
- Show exact amount and currency.
- Distinguish browser/provider handoff from Noma confirmation.
- Do not offer `Pay again` while outcome is uncertain.
- Do not hide a changed promise or removed item inside a toast.
- Show one Buyer Order concept while preserving item/vendor progress after confirmation.

---

## 40. Payment, refund, earnings, and payout patterns

### 40.1 Payment

Required visual states:

```text
Awaiting payment
Payment opened with provider
Verifying payment
Payment confirmed / Order confirmed
Payment failed
Payment cancelled/abandoned
Outcome uncertain / reconciliation
Duplicate/mismatch under review
```

### 40.2 Refund

Required visual states:

```text
Refund requested
Refund approved
Submitted to provider
Processing
Completed
Failed
Needs attention
Cancelled
Under reconciliation
```

### 40.3 Seller earning

Required buckets:

```text
Pending
Available
Held/disputed
Risk reserve
Processing payout
Paid
Negative exposure
```

### 40.4 Withdrawal/payout

Required distinction:

```text
Withdrawal requested
Under review
Approved
Transfer initiated/processing
Payout paid
Failed
Reversed
Requires reconciliation
```

### 40.5 Financial component rules

- Use exact amounts and references.
- Show source order/item/allocation where authorised.
- Show who acts next.
- Separate system/provider confirmation from human approval.
- Do not use editable status dropdowns for provider truth.
- Do not imply held funds are confiscated.
- Show ledger entries as append-only history, not a mutable balance field.

---

## 41. Buyer order tracking pattern

Buyer Order detail should show:

- one overall understandable order state;
- item/vendor/fulfilment groups with independent progress;
- current next action;
- delivery promise and changes;
- cancellation/refund per item;
- pickup/delivery status;
- handoff credential at the appropriate time;
- messages/help/case entry; and
- timeline.

The design must support:

- one vendor failure while others continue;
- split deliveries;
- food separated from ordinary products;
- delivery attempt and return to custody;
- delegate handoff; and
- item-level return/refund.

---

## 42. Cancellation pattern

Before cancellation, show:

- exact item/order portion;
- current lifecycle stage;
- whether cancellation is still allowed;
- expected refund amount;
- delivery/other cost effect;
- seller or buyer attribution where appropriate and safe;
- effect on unaffected items; and
- whether the action can be reversed.

Use action-specific labels such as `Cancel this item` or `Cancel remaining items`, not a generic `Cancel order` where scope is ambiguous.

---

## 43. Return, Protection Case, and evidence pattern

### 43.1 Intake

Use structured reason selection before free-form explanation.

The selected reason controls:

- requested evidence;
- deadlines;
- seller response;
- return logistics;
- remedy options; and
- staff queue.

### 43.2 Case detail

Must include:

- case identity/status;
- affected item/order;
- current owner and deadline;
- temporary safeguard where applicable;
- buyer/seller statements;
- evidence;
- custody/return status;
- financial exposure/remedy where authorised;
- decision;
- appeal; and
- timeline.

### 43.3 Decision design

A serious decision must show:

- issue and evidence summary;
- policy basis;
- fault/coverage classification;
- proposed remedy;
- financial/custody consequences;
- approval threshold;
- reason; and
- appeal eligibility.

AI-generated summaries, if later used, must be labelled as assistive and must link to source evidence.

---

## 44. Review and rating pattern

- Only eligible completed Noma purchases may produce verified-purchase reviews.
- Separate product quality/accuracy from seller transaction experience.
- Make moderation/report controls available.
- Do not remove genuine negative reviews merely because a seller refunded.
- Do not allow public seller reviews of buyers.
- Show sample-size context where rating volume is low.
- Do not display an average to excessive precision.
- Images in reviews follow secure upload and moderation rules.

---

## 45. Messaging and substitution pattern

Messaging contexts must be visibly labelled:

```text
Product question
Order conversation
Support case
Dispute/protection case
System timeline
```

Messages must distinguish:

- participant message;
- system event;
- blocked/warned content;
- Support/staff intervention; and
- structured action.

A substitution proposal must be a structured card with:

- original item;
- proposed replacement;
- condition/variant;
- price difference;
- delivery impact;
- expiry; and
- Approve/Decline actions.

A chat message alone never counts as buyer approval.

---

# Part C — Seller, Rider, Operations, and Admin patterns

## 46. Seller listing creation and editing

The listing pattern must adapt to category, commerce type, condition, seller type, and fulfilment source.

Required steps may include:

1. product match/create request;
2. seller offer details;
3. variants/attributes;
4. condition and defects;
5. images;
6. inventory/location;
7. price;
8. fulfilment/promise;
9. warranty/returns;
10. policy checks; and
11. review/submit.

Design rules:

- show only applicable fields;
- explain canonical product versus seller offer;
- save draft;
- identify missing required attributes;
- preserve actual-unit photo requirements;
- label AI suggestions and require seller review;
- preview the public listing; and
- show moderation result and correction path.

Service, Rental, Digital, and Event types must not appear as selectable options.

---

## 47. Seller Vendor Order and preparation

The Seller sees only their Vendor Order.

Required hierarchy:

- reference and deadline;
- current state;
- item/quantity/variant/condition;
- preparation instructions;
- approved pickup point;
- packaging/handling;
- buyer information limited to operational need;
- primary action;
- cancellation/problem path;
- rider pickup state; and
- linked case/earning where authorised.

The normal stocked-product primary action is `Prepare order`, not unnecessary acceptance.

Food and approved custom workflows may use explicit acceptance and ready-time controls when activated.

`Mark ready` must require required preparation checks and must not merely be a chat message.

---

## 48. Seller inventory pattern

Inventory views must support:

- offer/SKU;
- location/source;
- available quantity;
- reserved quantity;
- unavailable/held quantity where authorised;
- stock confidence/update time;
- pause/reconfirm state;
- low/out-of-stock warning;
- audit/movement history; and
- safe update.

An out-of-stock seller cancellation should visibly pause or require reconfirmation for the affected offer according to policy.

---

## 49. Rider PWA pattern

### 49.1 Rider shell

Persistent elements:

- current shift/availability;
- connectivity state;
- current assignment/custody;
- notifications/urgent incident;
- help/emergency route.

### 49.2 Assignment card

Show:

- job reference;
- pickup and delivery point;
- item/parcel count and handling;
- tier/deadline;
- distance/route guidance only where supported;
- custody state;
- compensation/earning summary where permitted;
- Accept/Decline/Start action according to assignment mode.

### 49.3 Action screens

Use one dominant action:

```text
Navigate to pickup
Scan parcel
Confirm custody
Navigate to handoff
Verify recipient PIN/QR
Report failed attempt
Return to custody point
```

### 49.4 Rider safety

- No dense tables.
- No private buyer history.
- No full recipient credential in advance.
- No delivery completion without proof.
- Incident and unsafe-condition action must remain reachable.
- Outdoor contrast and large targets are required.
- Offline draft versus confirmed state must be persistent.

---

## 50. Operations queue and intervention pattern

Operations pages use compact density but preserve hierarchy.

Required composition:

- visible institution/scope;
- operational pause/alert;
- saved queue/filter;
- count and age;
- table/list;
- next responsibility;
- promise/SLA risk;
- severity;
- assignment/owner;
- bulk action only where safe;
- authoritative detail link.

Intervention panel must show:

- current system truth;
- affected domains;
- actor authority;
- permitted action;
- consequence preview;
- reason/evidence requirement;
- approval requirement;
- audit effect; and
- customer/seller/rider communication.

A dashboard metric must link to the actual queue.

---

## 51. Finance pattern

Finance views must prioritise reconciliation and evidence over visual celebration.

Required patterns:

- payment/provider event timeline;
- expected versus verified amount;
- allocation table;
- refund decision/submission/provider state;
- seller ledger entries;
- withdrawal and payout batch;
- transfer attempts;
- failed/reversed/uncertain state;
- reconciliation exception; and
- approval/audit history.

Financial tables should use:

- aligned tabular numerals;
- currency labels;
- explicit positive/negative meaning;
- totals that reconcile visibly;
- source references; and
- no editable provider-final status.

---

## 52. Trust and Safety and enforcement pattern

The pattern must separate:

- allegation/signal;
- temporary safeguard;
- evidence;
- final finding;
- scoped action;
- active-order/inventory/money continuity;
- appeal; and
- correction/reversal.

Serious actions use a dedicated review page rather than a compact row dropdown.

The interface must not:

- equate a detector match with guilt;
- use sensational warning visuals for unconfirmed allegations;
- expose private risk detail publicly;
- encourage blanket account-wide action where a narrower safeguard is sufficient; or
- let the original decision-maker self-approve a serious appeal where independence is required.

---

## 53. Restricted Admin and emergency-control pattern

Admin high-risk controls include:

- feature activation;
- institution configuration;
- role/capability grants;
- payment/payout pause;
- checkout pause;
- category/seller/tier pause;
- policy version activation;
- access/security control; and
- restart after incident.

Every high-risk control must show:

```text
Current state
Proposed state
Affected institution/scope
Affected journeys and users
Immediate consequence
Reversibility
Reason
Required evidence
Maker/approver
Effective time
Review/restart condition
Audit reference
```

A generic toggle is insufficient for emergency or financial controls.

Restart must not be visually implied by resolving one technical error. It requires the defined readiness review and authority.

---

## 54. Progressive feature patterns

### 54.1 Food

Food UI may appear only after activation and must support:

- outlet open/closed/capacity;
- current menu availability;
- preparation estimate;
- seller acceptance/timeout;
- accepted/preparing/ready;
- substitutions where approved;
- food-specific cancellation; and
- perishable failed-handoff treatment.

### 54.2 External Vendor

Must clearly show:

- external inbound source;
- conservative inbound estimate;
- campus last-mile separation;
- current inbound/campus state; and
- no implication of ordinary direct seller-to-buyer delivery.

### 54.3 FBN

Must distinguish:

- seller-held stock;
- Noma-held stock;
- inbound planned/received/discrepant;
- bin/location;
- reserved/picked/packed;
- rider custody;
- returned/quarantined; and
- cycle-count/reconciliation state.

### 54.4 Pre-owned

Must surface:

- condition grade and definition;
- actual-unit imagery;
- defects;
- included/missing items;
- ownership declaration status where appropriate;
- serial/IMEI capture privately where applicable;
- stronger handoff/return evidence; and
- no false Noma inspection badge.

### 54.5 Priority and Saver

Delivery-tier design must make the operational difference understandable. Saver must not be presented as simply `cheap` if it requires a wider window/batching. Priority must not claim guaranteed speed without operational backing.

---

# Part D — Responsive behaviour

## 55. General responsive rules

- Preserve content priority; do not merely shrink desktop layouts.
- Keep the primary action reachable without covering focused fields or critical status.
- Avoid horizontal page scrolling except inside controlled data regions with alternatives.
- Reflow at narrow widths without loss of information or functionality.
- At `200%` zoom, core journeys must remain usable.
- At approximately `320 CSS px` width, content must reflow except where two-dimensional presentation is genuinely essential and an accessible alternative exists.
- Sticky elements must not obscure focus, errors, totals, or status.
- Drawers and bottom sheets must account for virtual keyboards and safe areas.
- Device rotation must not lose state.

---

## 56. Marketplace and Buyer responsive behaviour

### Mobile

- Search remains prominent.
- Bottom navigation prioritises Home, Categories, Search, Orders, and Cart.
- Product card minimum content remains image, title, condition, price, availability, and promise.
- Filters use a sheet with active count.
- Product detail stacks media, title/offer, purchase action, comparison, details.
- Checkout uses a focused step flow.
- Buyer tracking uses item/fulfilment cards rather than dense tables.

### Tablet/Desktop

- Search/header remain persistent where useful.
- Category/filter rail may remain visible.
- Product detail may use media + selected offer + offer comparison columns.
- Checkout may use main flow + sticky summary.
- Buyer order may show progress and item details side by side without losing reading order.

---

## 57. Seller responsive behaviour

### Mobile-safe actions

- accept where applicable;
- prepare;
- mark ready;
- stock/availability update;
- message;
- evidence/photo capture;
- view earnings summary;
- view case/action required.

### Tablet/Desktop priority

- complex listing creation;
- bulk inventory;
- offer comparison/editing;
- payouts and statements;
- performance analysis;
- multi-column order management.

Complex forms must remain readable on mobile but may advise use of a larger screen rather than hiding required functionality without an alternative.

---

## 58. Rider responsive behaviour

- Optimise for approved tablet/touch use.
- Use one-column action flow.
- Keep current job/custody/connectivity persistent.
- Use large buttons and large scan region.
- Avoid side-by-side controls that are easy to confuse.
- Keep incident/help reachable without exiting the job.
- Use high contrast under bright conditions.
- Minimise text entry.
- Support manual code entry and accessible fallback.

---

## 59. Operations and Admin responsive behaviour

### Operations

- Desktop/tablet first.
- Persistent workspace navigation.
- Dense readable queues.
- Filter/saved-view tools.
- Split preview only where the authoritative detail and focus order remain clear.
- Keyboard-efficient navigation may be added with documented shortcuts.
- High-risk actions remain separated.

### Admin

- Desktop/tablet first.
- Comparison of before/after values.
- Explicit scope.
- Long-form review over speed.
- Maker-checker state.
- No mobile-optimised one-tap emergency toggles.

---

# Part E — Accessibility

## 60. Accessibility target

Noma's Covenant pilot targets **WCAG 2.2 Level AA** across active critical journeys and components.

The W3C ARIA Authoring Practices Guide may inform accessible widget interaction and semantics, but native HTML must be preferred where it provides the required behaviour. ARIA must not be used to imitate a component without implementing its full keyboard and state model.

Accessibility applies to:

- public browsing;
- authentication;
- Covenant verification;
- search and filters;
- product/offer selection;
- cart and checkout;
- payment status;
- Buyer orders/cases/refunds;
- Seller listing and fulfilment;
- Rider pickup/handoff;
- Operations queues/cases;
- Finance and Admin controls; and
- notifications and transactional emails where applicable.

---

## 61. Semantic structure

Every page must include:

- unique, meaningful document title;
- one clear primary heading;
- logical heading order;
- landmark regions;
- skip link;
- semantic lists/tables/forms;
- labels associated with controls;
- buttons for actions and links for navigation;
- language declaration; and
- meaningful reading order independent of visual positioning.

Repeated card groups should be lists where appropriate.

---

## 62. Keyboard access and focus

- Every interactive element must be keyboard operable.
- Focus order must follow the logical task.
- Focus must remain visible and must not be obscured by sticky headers, sheets, or footers.
- Modal/dialog focus must be contained while open and returned to the invoking control on close.
- Escape/back behaviour must be predictable.
- Skip links must reach main content and, for complex staff surfaces, may include queue/detail shortcuts.
- Drag-only interactions require a non-drag alternative.
- Custom shortcuts must not interfere with typing and must be discoverable/disableable where required.

Noma's default focus indicator should use a clearly visible `2–3px` outline/ring with sufficient contrast and separation from the component boundary.

---

## 63. Pointer and touch access

- Default targets should be at least `44 × 44px`.
- Critical Rider controls should be at least `48 × 48px` or larger.
- Where a smaller target is unavoidable in dense desktop UI, spacing and an enlarged hit area must still prevent accidental activation and satisfy applicable WCAG requirements.
- Do not require precise dragging.
- Do not place `Confirm delivery` beside `Failed attempt` without strong separation.
- Hover information must also be available through focus/tap.

---

## 64. Forms and authentication accessibility

- Allow password managers and paste.
- Do not require memory puzzles or cognitive tests as the only authentication method.
- OTP inputs must accept paste and expose one understandable field/group.
- Errors must be textually identified and linked to fields.
- Instructions must appear before or with the control.
- Required format must not be communicated by placeholder alone.
- Timeouts must warn users and allow extension where security permits.
- Reauthentication dialogs must support screen readers, keyboard, password managers, and alternative second-factor entry.

---

## 65. Status updates and live regions

Use live announcements selectively for:

- search result updates;
- cart update confirmation;
- upload progress/completion;
- validation result;
- payment/refund/payout status resolution;
- scan validation;
- assignment change;
- offline/sync change; and
- critical operational alert.

Do not announce every timer tick, table refresh, or decorative change.

For long processing, announce the state once and provide a persistent textual status.

---

## 66. Tables and complex widgets

- Use native tables for tabular data.
- Provide headers, scope, captions, and row context.
- Avoid interactive controls inside every cell where a row-level action is clearer.
- Complex grids require a documented keyboard model and testing.
- Mobile alternatives must preserve all critical values/actions.
- Charts require text summaries and accessible data.
- Tabs, accordions, menus, dialogs, comboboxes, and listboxes must follow a documented accessible pattern.

---

## 67. Images, media, QR, and visual evidence

- Product images need alt text that conveys relevant differentiating information without repeating adjacent title.
- Decorative images use empty alt text.
- Actual-unit defect images require meaningful labels/captions where needed.
- QR/PIN workflows require a manual or staff-assisted accessible fallback that preserves security and audit.
- Camera permission denial must provide recovery.
- Evidence viewer controls must be keyboard operable.
- Do not require colour recognition to identify the correct product/parcel.

---

## 68. Colour, contrast, zoom, and reflow

- Meet the contrast rules in Section 8.
- Support browser zoom to at least `200%` without loss of core functionality.
- Reflow core content at narrow width.
- Do not lock viewport zoom.
- Do not use images of text for interface labels.
- High-contrast operating-system settings must preserve control boundaries and focus.
- Status meaning remains available without colour.

---

## 69. Motion, flashing, and vestibular safety

- Respect reduced-motion preferences.
- No flashing content that violates applicable thresholds.
- Avoid large background movement.
- Provide pause/stop controls for any non-essential moving content.
- Do not use motion as the only indicator of progress or change.

---

## 70. Accessibility testing requirements

For P0 journeys, testing must include:

- automated accessibility checks;
- keyboard-only completion;
- screen-reader smoke testing on supported browser/platform combinations;
- zoom/reflow testing;
- contrast review;
- touch-target review;
- reduced-motion review;
- form error recovery;
- asynchronous status announcement;
- QR/PIN fallback; and
- permission/error/processing states.

Automated tools are necessary but insufficient.

---

# Part F — Performance, resilience, and implementation contract

## 71. Performance design requirements

- Product images must use responsive dimensions and appropriate modern formats where supported.
- Above-the-fold Marketplace content must not wait for unnecessary analytics or decorative scripts.
- Fonts must avoid blocking rendering; use a reliable fallback strategy.
- Reserve media/component dimensions to prevent cumulative layout shift.
- Load heavy evidence viewers, charts, and specialist tools only when needed.
- Avoid shipping entire Operations/Admin component bundles to public Marketplace users.
- Skeletons should match final layout.
- Do not preload large campaign media at the expense of search/product content.
- Interaction feedback should occur promptly even when the final action remains processing.

Exact performance budgets will be locked in the technical architecture/testing strategy, but visual design must not require avoidable heavy animation, video, or oversized imagery.

---

## 72. Intermittent connectivity and resumability

Design must support safe resume for:

- registration/verification;
- cart;
- checkout status;
- listing draft;
- evidence upload;
- payout-account change;
- Rider assignment;
- pickup/handoff; and
- staff case decisions where safe.

Required patterns:

- draft saved state;
- last confirmed timestamp;
- retry without duplication;
- queued action where permitted;
- explicit non-queueable action where proof must be live;
- conflict resolution; and
- stable reference/support path.

---

## 73. Component package expectations

The Noma repository is expected to contain a shared design-system package, provisionally:

```text
packages/ui/
```

The technical architecture will finalise implementation, but the package should support:

```text
Foundations/tokens
Primitive components
Composite components
Commerce patterns
Surface-specific compositions
Accessibility utilities
Documentation/examples
Tests
```

Feature code should consume components through approved public exports rather than deep internal imports.

### 73.1 Component API principles

- Use semantic properties rather than raw style overrides.
- Prefer `tone="danger"` over `background="#B91C1C"`.
- Keep variants finite and documented.
- Do not expose props that permit inaccessible combinations.
- Support standard HTML attributes and refs where appropriate.
- Ensure loading/disabled states preserve accessible names.
- Components must not contain business authorization logic; they present the state and actions provided by authorized feature code.
- High-level commerce components may encode product presentation rules but must not fabricate domain state.

---

## 74. Required component inventory for the pilot

### Foundations

- tokens;
- global styles/reset;
- typography;
- layout/container/grid;
- focus ring;
- visually hidden utility;
- responsive visibility utility with accessibility safeguards.

### Actions and input

- Button;
- IconButton;
- Link;
- TextField;
- PasswordField;
- TextArea;
- Select/Combobox;
- Checkbox;
- RadioGroup;
- Switch;
- SegmentedControl;
- QuantityStepper;
- OTP/PIN input;
- SearchField;
- FileUploader.

### Feedback and status

- Badge/StatusBadge;
- Alert;
- Banner;
- InlineMessage;
- Toast/Snackbar;
- Progress/Stepper;
- Spinner;
- Skeleton;
- EmptyState;
- ErrorState;
- OfflineState;
- ProcessingState.

### Navigation and disclosure

- Header;
- MobileBottomNav;
- Sidebar;
- SurfaceSwitcher;
- Breadcrumbs;
- Tabs;
- Accordion/Expansion;
- Pagination;
- Menu/Popover;
- Tooltip;
- Drawer/Sheet;
- Dialog/AlertDialog.

### Data and operational

- Table;
- ResponsiveRecordList;
- QueueToolbar;
- FilterBar;
- SavedViewSelector;
- Timeline;
- KeyValueList;
- MoneyDisplay;
- Deadline/SLA display;
- ScopeIndicator;
- AuditReference.

### Commerce

- ProductCard;
- ProductMediaGallery;
- PriceDisplay;
- PromotionLabel;
- OfferCard/OfferComparisonRow;
- SellerSummary;
- ConditionSummary;
- ActualItemIndicator;
- AvailabilitySignal;
- DeliveryPromise;
- FulfilmentSourceBadge;
- CartSellerGroup;
- FulfilmentGroupCard;
- OrderItemCard;
- OrderProgress;
- DeliveryTierCard;
- RefundStatus;
- EarningsBalance;
- LedgerEntryRow;
- CaseSummary;
- EvidenceViewer;
- ReviewSummary.

### Rider/operations

- ConnectivityIndicator;
- CustodyStatus;
- ScanPanel;
- PINVerification;
- AssignmentCard;
- FailedAttemptReason;
- IncidentAction;
- InterventionPanel;
- ApprovalPanel;
- BeforeAfterConfiguration;
- EmergencyControlPanel.

---

## 75. Component documentation standard

Every reusable component must document:

1. purpose;
2. anatomy;
3. approved variants;
4. properties;
5. states;
6. responsive behaviour;
7. keyboard behaviour;
8. screen-reader semantics;
9. contrast/target requirements;
10. content rules;
11. do/don't examples;
12. relevant journey/page references;
13. test coverage; and
14. deprecation status.

A screenshot without behaviour and accessibility documentation is not a complete component specification.

---

## 76. Component lifecycle and governance

Component lifecycle:

```text
Proposed
    ↓
Reviewed
    ↓
Experimental/internal
    ↓
Stable
    ↓
Deprecated
    ↓
Removed
```

### 76.1 Adding a component

A new component requires:

- recurring problem statement;
- review of existing components/patterns;
- anatomy and API proposal;
- accessibility behaviour;
- responsive behaviour;
- visual states;
- usage examples;
- tests; and
- owner.

### 76.2 One-off styles

A one-off is acceptable only when the design is genuinely unique and cannot responsibly be expressed through an existing component or composition. It must still use tokens.

Repeated one-off patterns must be promoted into the design system.

### 76.3 Breaking changes

Breaking changes require:

- migration guidance;
- affected surface/journey inventory;
- visual and accessibility regression review;
- version/change log; and
- removal plan.

---

## 77. Figma and code parity

Where Figma is used:

- token names should map to code concepts;
- component variants should match supported code variants;
- states must include loading, error, disabled, processing, and focus—not only default visuals;
- responsive frames must state behaviour, not merely show two screenshots;
- role/scope annotations must identify hidden or protected data;
- journey IDs and route/page IDs must appear in design notes;
- designs must identify source-of-truth status and asynchronous behaviour; and
- final implementation differences must be recorded rather than silently drifting.

The code implementation remains subject to product, accessibility, and security validation even when it visually matches Figma.

---

## 78. Required critical screen approval set

Before Codex implements the corresponding major frontend flow, Product/Design must approve at least:

| Priority | Screen/flow | Required states |
|---|---|---|
| P0 | Marketplace home/category | default, campaign, empty/paused |
| P0 | Search/results/filter | results, zero-result, typo, loading, error |
| P0 | Product detail/offers | multiple offers, unavailable, pre-owned, external/FBN gated |
| P0 | Cart | multi-seller, stale item, partial recovery |
| P0 | Checkout/payment | validation, provider handoff, verifying, failed, uncertain, confirmed |
| P0 | Buyer order/tracking | split progress, cancellation, failed handoff, refund |
| P0 | Seller listing | draft, validation, moderation, pre-owned condition |
| P0 | Seller Vendor Order | prepare, ready, cancellation/problem, pickup |
| P0 | Rider assignment/pickup/handoff | online, offline/cached, mismatch, failed attempt |
| P0 | Operations order/dispatch | queue, detail, intervention, reassignment |
| P0 | Protection Case | intake, evidence, decision, return, appeal |
| P0 | Finance refund/payout | approval, processing, failure, reversal, reconciliation |
| P0 | Admin emergency control | review, maker-checker, active pause, restart review |
| P1 | Food | outlet/menu, acceptance, preparation, cancellation |
| P1 | External inbound | inbound, receipt, campus last mile |
| P1 | FBN | receive, bin, pick/pack, quarantine |

Approval must include responsive and accessibility annotations.

---

## 79. Design QA and visual regression

For each component/page family, QA should verify:

- correct token usage;
- correct component variant;
- all required states;
- no hidden critical information;
- responsive behaviour;
- keyboard/focus behaviour;
- screen-reader semantics;
- contrast and touch targets;
- long text and large numbers;
- empty/large datasets;
- slow/offline/provider uncertainty;
- permission denied and feature gated;
- localisation-safe layout;
- reduced motion;
- visual regression; and
- no deferred feature exposure.

Test data must include:

- long product/seller names;
- large naira values;
- low and zero stock;
- multiple sellers and fulfilments;
- partial cancellation/refund;
- low rating sample size;
- long evidence/case timeline;
- expired/failed credentials;
- weak connectivity;
- very narrow and zoomed layouts; and
- high-risk staff confirmation.

---

## 80. Analytics and privacy in components

Components may emit interaction events needed for product and operational measurement, but must not include:

- passwords or OTPs;
- full bank-account numbers;
- identity evidence;
- private message content;
- full case evidence;
- recipient credentials;
- secret/provider keys;
- unnecessary user names or contact details; or
- internal risk detail.

Analytics must not become authoritative truth for payment, order, custody, refund, payout, or enforcement.

---

## 81. Prohibited design shortcuts

The Covenant pilot must not:

1. use a generic AI-generated purple-gradient dashboard as the shared visual language;
2. build giant hero sections that push search/products below the first useful viewport;
3. wrap every section in a heavily rounded card;
4. use decorative metric cards without decisions or underlying queues;
5. use colour alone for status;
6. display `Completed` for an unresolved provider or custody action;
7. display `Verified` without identifying what was verified;
8. hide condition, delivery, or return information to simplify a product card;
9. make the cheapest offer look recommended without explaining total value;
10. silently replace an invalid cart item;
11. hide an item-level failure behind a single Parent Order status;
12. make WhatsApp or personal contact a primary commerce action;
13. display seller private data in public cards;
14. expose full bank details in routine UI;
15. use a toast as the only financial or custody confirmation;
16. allow a human-editable dropdown to represent provider-final status;
17. use `Are you sure?` as the complete high-risk confirmation;
18. place destructive and safe actions with equal emphasis;
19. use inaccessible custom controls when native HTML is sufficient;
20. rely on hover for required information;
21. disable paste/password managers in authentication;
22. use tiny icon hit targets in Rider or mobile flows;
23. squeeze desktop tables onto mobile without an alternative;
24. animate totals/status in a way that obscures the final value;
25. show indefinite spinners without ownership/retry status;
26. make offline Rider data look server-confirmed;
27. expose progressive or deferred navigation before activation;
28. build one-off components for every page;
29. hardcode raw colours/spacing throughout feature code;
30. copy another marketplace's branded page or component wholesale;
31. allow AI to fabricate product images or remove pre-owned defects;
32. show sponsored content without explicit labelling;
33. use fake urgency, fake scarcity, or unsupported discounts;
34. hide accessibility behaviour from the definition of done;
35. treat visual Figma approval as permission/security approval;
36. optimise staff action speed by removing evidence or approval context;
37. hide original promises after an ETA changes;
38. show a temporary safeguard as a final finding;
39. use public error states that confirm sensitive record existence; or
40. ship partial dark mode or native-app prompts that imply unavailable capabilities.

---

## 82. Minimum design-system validation scenarios

Design, Engineering, and QA must validate at least:

1. Guest searches and compares products on narrow mobile without forced registration.
2. Product results remain comparable with long titles, prices, conditions, and promises.
3. Buyer compares multiple offers and understands why one is recommended.
4. Pre-owned offer shows actual-item and defect information without a false verification badge.
5. Cart removes one stale item while preserving unaffected sellers/items.
6. Checkout revalidates and displays a changed price/promise clearly.
7. Payment remains `verifying` after browser return until server/provider confirmation.
8. Payment uncertainty disables duplicate payment while preserving a reference and exit path.
9. Parent Order shows independent Vendor Order/fulfilment progress without internal jargon overload.
10. Buyer cancellation preview shows affected item, refund, cost, and unaffected order portions.
11. Refund approved, submitted, processing, and completed look and read differently.
12. Seller order uses `Prepare order`, required deadline, and limited buyer information.
13. Seller out-of-stock failure requires reconfirmation and shows consequence.
14. Rider scans the wrong parcel and sees expected versus scanned information safely.
15. Rider loses connectivity and can distinguish cached, draft, pending sync, and confirmed states.
16. Rider failed handoff does not visually complete delivery.
17. Support sees case evidence but no Finance-only action.
18. Finance sees allocations/provider evidence and cannot edit provider-final truth.
19. Trust and Safety temporary safeguard is distinct from final fault decision.
20. Admin pause control shows scope, impact, approval, and restart requirement.
21. Revoked role removes navigation and direct access shows a safe denial.
22. Food/FBN/External/Pre-owned progressive patterns remain hidden until activation.
23. Long text, 200% zoom, narrow reflow, and large naira values remain usable.
24. Keyboard user completes search, checkout, Seller action, Rider fallback, case, and Admin confirmation.
25. Screen-reader user receives meaningful headings, labels, errors, and asynchronous status updates.
26. Reduced-motion user receives no essential information only through animation.
27. High-contrast mode preserves focus and control boundaries.
28. Empty, loading, stale, error, unavailable, processing, and offline states use the correct pattern.
29. Destructive actions remain separated from primary safe actions.
30. No production screen displays the rejected generic AI visual patterns.

---

## 83. Rules for Codex and contributors

For every frontend task, Codex must:

1. cite the applicable Journey ID(s) and IA route/page family;
2. identify the actor, surface, capability, resource scope, and feature state;
3. use approved tokens and components;
4. identify required default, loading, empty, error, processing, success, stale, restricted, and offline states;
5. preserve truthful payment, refund, payout, order, fulfilment, and custody language;
6. preserve role-specific field visibility;
7. implement responsive behaviour for supported devices;
8. implement keyboard, focus, semantic, screen-reader, contrast, and target behaviour;
9. preserve safe retry/idempotency cues;
10. avoid one-off style values where tokens exist;
11. avoid activating progressive/deferred navigation or components;
12. add component/unit/accessibility tests where applicable;
13. add visual regression or screenshot evidence for critical screens where the project tooling supports it;
14. state intentional deviations and obtain review; and
15. provide lint, type-check, test, build, and relevant accessibility evidence.

Codex must not infer missing visual policy from a competitor, template, or prior unrelated project. Ambiguity must be reported against the Build Pack hierarchy.

---

## 84. Definition of done for a component

A component is complete only when:

- its purpose and boundaries are documented;
- anatomy and approved variants are defined;
- token usage is correct;
- all applicable states are implemented;
- keyboard and screen-reader behaviour is defined and tested;
- visible focus and contrast pass;
- target size is appropriate;
- responsive behaviour is defined;
- long/empty/error/loading content is covered;
- content rules are documented;
- business meaning is not fabricated;
- tests pass;
- examples are available; and
- no inaccessible override is exposed.

---

## 85. Definition of done for a page or flow

A page or flow is complete only when:

- it uses the correct surface and page anatomy;
- content priority matches `docs/04-information-architecture.md`;
- actor and field visibility match `docs/02-user-roles.md`;
- happy and material exception paths match `docs/03-user-journeys.md`;
- only in-scope/progressively active capabilities are shown;
- current state and next responsibility are clear;
- primary and destructive actions are correctly emphasised;
- all required visual/system states exist;
- money, custody, evidence, promise, and verification language is truthful;
- responsive behaviour is validated;
- keyboard/screen-reader/zoom/touch/reduced-motion behaviour is validated;
- provider uncertainty and retries are safe;
- analytics and audit hooks do not leak sensitive data;
- Operations can understand/intervene where required;
- visual regression is reviewed; and
- implementation evidence is approved before merge.

---

## 86. Required design artefacts after this document

This document defines the system. Product/Design must still create and approve implementation artefacts:

1. token library and interim palette sheet;
2. typography and spacing specimen;
3. component inventory and status;
4. component documentation/examples;
5. Marketplace desktop/mobile navigation;
6. Buyer Account navigation;
7. Seller Centre navigation;
8. Rider PWA navigation/offline map;
9. Operations/Admin navigation;
10. homepage/category/search wireframes;
11. product and offer-comparison design;
12. cart and checkout design;
13. payment uncertainty/confirmation design;
14. Buyer order/tracking/case design;
15. Seller listing/order/preparation design;
16. Rider pickup/handoff/failed-attempt design;
17. Operations order/dispatch/case design;
18. Finance refund/payout/reconciliation design;
19. Admin high-risk-control design;
20. empty/loading/error/offline pattern sheet;
21. timeline/status pattern sheet;
22. responsive annotations;
23. accessibility annotations; and
24. final brand/logo update when supplied.

These artefacts must reference route/page IDs and Journey IDs.

---

## 87. Traceability to the 15 locked scope decisions

This design-system contract supports the locked scope by:

1. providing Food components behind progressive activation;
2. distinguishing External Vendor inbound promises and campus last mile;
3. supporting one-location FBN receiving, storage, pick/pack, custody, and quarantine patterns;
4. supporting structured Pre-Owned actual-unit, condition, defect, and evidence presentation;
5. excluding Service, Rental, Digital, and Event patterns from live navigation;
6. presenting one Buyer Order while preserving item/vendor/fulfilment progress;
7. visually separating payment, earnings, refunds, withdrawals, payouts, and reconciliation;
8. supporting Noma-controlled hybrid dispatch, secure pickup/handoff, and Rider connectivity states;
9. separating Covenant affiliation, account, seller, payout, rider, and trust signals;
10. creating one shared system with distinct Marketplace, Buyer, Seller, Rider, Operations, and Admin expressions;
11. supporting structured messaging, privacy, anti-bypass, and buyer-approved substitution;
12. supporting structured cases, evidence, human decisions, controls, and appeals;
13. supporting relevance-first search, transparent merchandising, and reviewable AI assistance;
14. requiring accessible, secure, resilient, testable components before paid launch; and
15. supporting capacity, pause, rollback, incident, and staged activation states.

---

## 88. External standards and reference systems

This contract is informed by, but does not copy:

- [W3C Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/);
- [W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/);
- [eBay Playbook design-system tokens](https://playbook.ebay.com/design-system/tokens);
- [eBay Playbook components and patterns](https://playbook.ebay.com/design-system/components); and
- official commerce/admin component-system guidance reviewed during preparation.

External systems are references for reusable design-system discipline and accessibility. They do not override Noma's product, role, journey, information-architecture, privacy, or pilot-scope contracts.

---

## 89. Open brand decision register

The following remain open brand inputs, not open product-behaviour questions:

| Decision | Current pilot handling | Constraint |
|---|---|---|
| Final logo/wordmark | accessible text fallback and reserved logo slot | must work at mobile header size |
| Permanent primary brand colour | interim ink + green brand layer | remap brand tokens only; preserve semantic/accessibility tokens |
| Proprietary typeface | Inter/Geist/system stack | must preserve readability/performance |
| Illustration style | restrained, purposeful, non-AI-cliché | cannot replace product/evidence content |
| Campaign art direction | compact and product-supporting | cannot displace search, status, or critical actions |
| Dark mode | not active in MVP | no partial exposure |

Resolving these items does not permit changes to product scope, authority, status semantics, or accessibility requirements.

---

## 90. Final design declaration

Noma's Covenant pilot will use a disciplined, accessible, commerce-first design system that is dense enough for serious marketplace operation, simple enough for students, Nigerian in real operating context, university-native, and recognisably Noma.

The system will use named tokens, restrained visual styling, clear product and offer comparison, truthful money and custody states, role-specific surface compositions, accessible form and navigation patterns, touch-safe Rider workflows, dense but readable Operations interfaces, deliberate high-risk confirmations, and complete loading, empty, error, processing, uncertain, restricted, offline, and recovery states.

Noma will not launch with a generic AI-generated visual language, decorative dashboards, false urgency, ambiguous verification, hidden commerce information, inaccessible custom components, or screens that make an unresolved obligation appear complete.

Visual polish is required, but truth, safety, accessibility, performance, and operational clarity take priority.
