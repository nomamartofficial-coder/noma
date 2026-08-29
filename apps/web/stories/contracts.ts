export const FIXED_STORY_INSTANT = '2026-01-15T09:00:00+01:00';

export const nomaViewports = Object.freeze({
  'noma-mobile-320': { name: 'Noma mobile 320', styles: { width: '320px', height: '800px' } },
  'noma-mobile-390': { name: 'Noma mobile 390', styles: { width: '390px', height: '844px' } },
  'noma-mobile-480': { name: 'Noma mobile 480', styles: { width: '480px', height: '900px' } },
  'noma-tablet-768': { name: 'Noma tablet 768', styles: { width: '768px', height: '1024px' } },
  'noma-desktop-1024': { name: 'Noma desktop 1024', styles: { width: '1024px', height: '768px' } },
  'noma-desktop-1440': { name: 'Noma desktop 1440', styles: { width: '1440px', height: '900px' } },
} as const);

export type StoryClassification = 'PUBLIC_UI' | 'SURFACE_COMPOSITION' | 'INTERNAL_HELPER';
export type UniversalPresentationState =
  | 'LOADING'
  | 'EMPTY'
  | 'NO_RESULTS'
  | 'ERROR'
  | 'PENDING'
  | 'DISABLED'
  | 'PERMISSION_RESTRICTED'
  | 'UNAUTHENTICATED'
  | 'EXPIRED'
  | 'RATE_LIMITED'
  | 'OFFLINE'
  | 'CONFLICT';

export type StateApplicability =
  | Readonly<{ kind: 'DIRECT'; storyIds: readonly string[] }>
  | Readonly<{ kind: 'COMPOSITION'; ownerStoryId: string; storyIds: readonly string[]; rationale: string }>
  | Readonly<{ kind: 'NOT_APPLICABLE'; rationale: string }>;

export interface StoryInventoryEntry {
  readonly id: string;
  readonly label: string;
  readonly classification: StoryClassification;
  readonly source: string;
  readonly exportNames: readonly string[];
  readonly storyIds: readonly string[];
}

export interface VisualBaselineEntry {
  readonly id: string;
  readonly storyId: string;
  readonly viewport: keyof typeof nomaViewports;
  readonly forcedColours?: boolean;
}

const publicUi = (id: string, label: string, source: string, exportNames: readonly string[], storyIds: readonly string[]): StoryInventoryEntry =>
  Object.freeze({ id, label, classification: 'PUBLIC_UI', source, exportNames, storyIds });
const composition = (id: string, label: string, source: string, storyIds: readonly string[]): StoryInventoryEntry =>
  Object.freeze({ id, label, classification: 'SURFACE_COMPOSITION', source, exportNames: [], storyIds });
const helper = (id: string, label: string, source: string, exportNames: readonly string[], storyIds: readonly string[]): StoryInventoryEntry =>
  Object.freeze({ id, label, classification: 'INTERNAL_HELPER', source, exportNames, storyIds });

export const storyInventory = Object.freeze([
  helper('tokens', 'Core, semantic, component, and commerce tokens', 'packages/ui/src/tokens.ts', ['coreTokenValues', 'createCssTokenDeclarations', 'densityModes', 'requiredSemanticTokenNames', 'resolveTokenValue', 'resolvedTokenValues', 'semanticTokenAliases', 'statusTones', 'toCssVariableName', 'tokenRegistry', 'uiPackage', 'componentTokenAliases', 'createComponentTokenDeclarations', 'requiredComponentTokenNames', 'commerceTokenAliases', 'createCommerceTokenDeclarations', 'requiredCommerceTokenNames'], ['foundations-noma--colour', 'foundations-noma--typography-spacing']),
  publicUi('button', 'Button and IconButton', 'packages/ui/src/interactive-primitives.tsx', ['Button', 'IconButton'], ['primitives-noma--button-matrix', 'primitives-noma--button-forced-colours-focus']),
  publicUi('fields', 'Field, TextField, PasswordField, TextArea, Form, and FormErrorSummary', 'packages/ui/src/static-primitives.tsx', ['Field', 'Form', 'FormErrorSummary', 'PasswordField', 'TextArea', 'TextField'], ['primitives-noma--form-errors']),
  publicUi('choices', 'Select, Checkbox, Radio, and RadioGroup', 'packages/ui/src/interactive-primitives.tsx', ['Checkbox', 'Radio', 'RadioGroup', 'Select'], ['primitives-noma--choice-controls']),
  publicUi('overlays', 'Dialog and Drawer', 'packages/ui/src/interactive-primitives.tsx', ['Dialog', 'Drawer'], ['primitives-noma--dialog-open', 'primitives-noma--drawer-open']),
  publicUi('navigation', 'Link, Tabs, Menu, and Pagination', 'packages/ui/src', ['Link', 'Menu', 'Pagination', 'Tabs'], ['primitives-noma--menu-open', 'primitives-noma--navigation-controls']),
  publicUi('table', 'Semantic table family', 'packages/ui/src/static-primitives.tsx', ['Table', 'TableBody', 'TableCaption', 'TableCell', 'TableHead', 'TableHeaderCell', 'TableRow'], ['primitives-noma--responsive-table']),
  publicUi('toast', 'ToastProvider and useToast', 'packages/ui/src/interactive-primitives.tsx', ['ToastProvider', 'useToast'], ['primitives-noma--toast-feedback']),
  publicUi('status', 'StatusChip, CommerceStatus, and material timestamp formatting', 'packages/ui/src/commerce-status.tsx', ['CommerceStatus', 'StatusChip', 'formatMaterialTimestamp'], ['commerce-noma--status-phases']),
  publicUi('banners', 'ResponsibilityBanner and DeadlineBanner', 'packages/ui/src/commerce-status.tsx', ['DeadlineBanner', 'ResponsibilityBanner'], ['commerce-noma--responsibility-deadline']),
  publicUi('money', 'Money, MoneyBreakdown, and exact minor-unit formatting', 'packages/ui/src/commerce-money.tsx', ['Money', 'MoneyBreakdown', 'formatMoneyMinorUnits'], ['commerce-noma--money-extremes', 'commerce-noma--money-breakdown']),
  publicUi('timeline', 'Timeline and TimelineItem', 'packages/ui/src/commerce-timeline.tsx', ['Timeline', 'TimelineItem'], ['commerce-noma--timeline-corrections']),
  publicUi('evidence', 'EvidenceCard', 'packages/ui/src/commerce-evidence.tsx', ['EvidenceCard'], ['commerce-noma--evidence-safe']),
  publicUi('high-risk', 'HighRiskConfirmation', 'packages/ui/src/high-risk-confirmation.tsx', ['HighRiskConfirmation'], ['commerce-noma--high-risk-required-reason']),
  composition('marketplace', 'Marketplace shell', 'apps/web/src/app/(marketplace)/layout.tsx', ['consumer-shells--marketplace']),
  composition('buyer', 'Buyer account shell', 'apps/web/src/app/(buyer)/account/layout.tsx', ['consumer-shells--buyer-account', 'consumer-shells--buyer-loading', 'consumer-shells--buyer-error']),
  composition('surface-switcher', 'Production surface switcher', 'apps/web/src/shells/surface-switcher.tsx', ['consumer-shells--surface-switcher-open']),
  composition('protected-unavailable', 'Neutral protected route denial', 'apps/web/src/app/not-found.tsx', ['protected-access--unavailable']),
  composition('seller', 'Seller shell', 'apps/web/src/shells/protected/seller/seller-shell.tsx', ['protected-seller--overview']),
  composition('rider', 'Rider shell and connectivity', 'apps/web/src/shells/protected/rider/rider-shell.tsx', ['protected-rider--server-confirmed', 'protected-rider--cached', 'protected-rider--local-draft', 'protected-rider--pending-sync', 'protected-rider--sync-failed', 'protected-rider--conflict', 'protected-rider--connection-required', 'protected-rider--action-mode']),
  composition('operations', 'Operations shell and queue', 'apps/web/src/shells/protected/operations/operations-shell.tsx', ['protected-operations--queue']),
  composition('admin', 'Admin shell and review frame', 'apps/web/src/shells/protected/admin/admin-shell.tsx', ['protected-admin--review', 'protected-admin--shell']),
] as const satisfies readonly StoryInventoryEntry[]);

const direct = (...storyIds: string[]): StateApplicability => Object.freeze({ kind: 'DIRECT', storyIds });
const composed = (ownerStoryId: string, rationale: string, ...storyIds: string[]): StateApplicability =>
  Object.freeze({ kind: 'COMPOSITION', ownerStoryId, storyIds, rationale });
const notApplicable = (rationale: string): StateApplicability => Object.freeze({ kind: 'NOT_APPLICABLE', rationale });

export const stateApplicability = Object.freeze({
  LOADING: composed('buyer', 'The route-owned Buyer account boundary preserves shell geometry while loading.', 'consumer-shells--buyer-loading'),
  EMPTY: notApplicable('Current shells are truthful capability placeholders and do not claim authoritative empty business collections.'),
  NO_RESULTS: notApplicable('No production search-results component exists before the marketplace feature tasks.'),
  ERROR: composed('buyer', 'The Buyer account error boundary owns retry and safe-return presentation.', 'consumer-shells--buyer-error'),
  PENDING: direct('primitives-noma--button-matrix', 'commerce-noma--status-phases', 'protected-rider--pending-sync'),
  DISABLED: direct('primitives-noma--button-matrix', 'primitives-noma--choice-controls'),
  PERMISSION_RESTRICTED: composed('protected-unavailable', 'Protected denial deliberately discloses no authorization cause.', 'protected-access--unavailable'),
  UNAUTHENTICATED: composed('protected-unavailable', 'Protected denial deliberately uses the same neutral unavailable presentation.', 'protected-access--unavailable'),
  EXPIRED: direct('commerce-noma--responsibility-deadline'),
  RATE_LIMITED: notApplicable('No rate-limit presentation contract exists before owning API and journey work.'),
  OFFLINE: direct('protected-rider--cached', 'protected-rider--local-draft', 'protected-rider--pending-sync', 'protected-rider--sync-failed', 'protected-rider--connection-required'),
  CONFLICT: direct('protected-rider--conflict'),
} as const satisfies Readonly<Record<UniversalPresentationState, StateApplicability>>);

export const visualBaselineManifest = Object.freeze([
  { id: 'foundations-colour-1440', storyId: 'foundations-noma--colour', viewport: 'noma-desktop-1440' },
  { id: 'foundations-type-spacing-1440', storyId: 'foundations-noma--typography-spacing', viewport: 'noma-desktop-1440' },
  { id: 'button-matrix-390', storyId: 'primitives-noma--button-matrix', viewport: 'noma-mobile-390' },
  { id: 'button-focus-forced-colours-390', storyId: 'primitives-noma--button-forced-colours-focus', viewport: 'noma-mobile-390', forcedColours: true },
  { id: 'form-errors-390', storyId: 'primitives-noma--form-errors', viewport: 'noma-mobile-390' },
  { id: 'dialog-open-390', storyId: 'primitives-noma--dialog-open', viewport: 'noma-mobile-390' },
  { id: 'menu-open-390', storyId: 'primitives-noma--menu-open', viewport: 'noma-mobile-390' },
  { id: 'table-responsive-768', storyId: 'primitives-noma--responsive-table', viewport: 'noma-tablet-768' },
  { id: 'status-phases-390', storyId: 'commerce-noma--status-phases', viewport: 'noma-mobile-390' },
  { id: 'responsibility-deadline-390', storyId: 'commerce-noma--responsibility-deadline', viewport: 'noma-mobile-390' },
  { id: 'money-extremes-390', storyId: 'commerce-noma--money-extremes', viewport: 'noma-mobile-390' },
  { id: 'money-breakdown-480', storyId: 'commerce-noma--money-breakdown', viewport: 'noma-mobile-480' },
  { id: 'timeline-corrections-768', storyId: 'commerce-noma--timeline-corrections', viewport: 'noma-tablet-768' },
  { id: 'evidence-safe-390', storyId: 'commerce-noma--evidence-safe', viewport: 'noma-mobile-390' },
  { id: 'high-risk-reason-390', storyId: 'commerce-noma--high-risk-required-reason', viewport: 'noma-mobile-390' },
  { id: 'marketplace-320', storyId: 'consumer-shells--marketplace', viewport: 'noma-mobile-320' },
  { id: 'marketplace-1440', storyId: 'consumer-shells--marketplace', viewport: 'noma-desktop-1440' },
  { id: 'buyer-loading-390', storyId: 'consumer-shells--buyer-loading', viewport: 'noma-mobile-390' },
  { id: 'buyer-error-768', storyId: 'consumer-shells--buyer-error', viewport: 'noma-tablet-768' },
  { id: 'buyer-account-1440', storyId: 'consumer-shells--buyer-account', viewport: 'noma-desktop-1440' },
  { id: 'surface-switcher-open-390', storyId: 'consumer-shells--surface-switcher-open', viewport: 'noma-mobile-390' },
  { id: 'protected-unavailable-390', storyId: 'protected-access--unavailable', viewport: 'noma-mobile-390' },
  { id: 'seller-390', storyId: 'protected-seller--overview', viewport: 'noma-mobile-390' },
  { id: 'seller-1440', storyId: 'protected-seller--overview', viewport: 'noma-desktop-1440' },
  { id: 'rider-pending-sync-390', storyId: 'protected-rider--pending-sync', viewport: 'noma-mobile-390' },
  { id: 'rider-conflict-768', storyId: 'protected-rider--conflict', viewport: 'noma-tablet-768' },
  { id: 'rider-action-390', storyId: 'protected-rider--action-mode', viewport: 'noma-mobile-390' },
  { id: 'operations-queue-480', storyId: 'protected-operations--queue', viewport: 'noma-mobile-480' },
  { id: 'operations-queue-1440', storyId: 'protected-operations--queue', viewport: 'noma-desktop-1440' },
  { id: 'admin-review-768', storyId: 'protected-admin--review', viewport: 'noma-tablet-768' },
  { id: 'admin-shell-1440', storyId: 'protected-admin--shell', viewport: 'noma-desktop-1440' },
] as const satisfies readonly VisualBaselineEntry[]);
