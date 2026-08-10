export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T;

function deepFreeze<const T extends object>(value: T): DeepReadonly<T> {
  for (const child of Object.values(value)) {
    if (typeof child === 'object' && child !== null && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }
  return Object.freeze(value) as DeepReadonly<T>;
}

export const uiPackage = deepFreeze({ name: '@noma/ui', boundary: 'browser' } as const);
export type UiPackage = typeof uiPackage;

export const statusTones = deepFreeze([
  'info',
  'success',
  'warning',
  'danger',
  'processing',
] as const);
export type StatusTone = (typeof statusTones)[number];

export const densityModes = deepFreeze(['comfortable', 'compact', 'action'] as const);
export type DensityMode = (typeof densityModes)[number];

export const coreTokenValues = deepFreeze({
  'color.neutral.0': '#FFFFFF',
  'color.neutral.25': '#FCFCFD',
  'color.neutral.50': '#F8FAFC',
  'color.neutral.100': '#F1F5F9',
  'color.neutral.200': '#E2E8F0',
  'color.neutral.300': '#CBD5E1',
  'color.neutral.400': '#94A3B8',
  'color.neutral.500': '#64748B',
  'color.neutral.600': '#475569',
  'color.neutral.700': '#334155',
  'color.neutral.800': '#1E293B',
  'color.neutral.900': '#0F172A',
  'color.neutral.950': '#020617',

  'color.brand.50': '#F0FDF4',
  'color.brand.100': '#DCFCE7',
  'color.brand.200': '#BBF7D0',
  'color.brand.500': '#16A34A',
  'color.brand.600': '#15803D',
  'color.brand.700': '#166534',
  'color.brand.800': '#14532D',
  'color.brand.900': '#052E16',

  'color.functional.info.strong': '#1E3A8A',
  'color.functional.info.default': '#1D4ED8',
  'color.functional.info.background': '#EFF6FF',
  'color.functional.info.border': '#BFDBFE',
  'color.functional.success.strong': '#14532D',
  'color.functional.success.default': '#15803D',
  'color.functional.success.background': '#F0FDF4',
  'color.functional.success.border': '#BBF7D0',
  'color.functional.warning.strong': '#78350F',
  'color.functional.warning.default': '#B45309',
  'color.functional.warning.background': '#FFFBEB',
  'color.functional.warning.border': '#FDE68A',
  'color.functional.danger.strong': '#7F1D1D',
  'color.functional.danger.default': '#B91C1C',
  'color.functional.danger.background': '#FEF2F2',
  'color.functional.danger.border': '#FECACA',
  'color.functional.processing.strong': '#3730A3',
  'color.functional.processing.default': '#4F46E5',
  'color.functional.processing.background': '#EEF2FF',
  'color.functional.processing.border': '#C7D2FE',
  'color.neutral.950.scrim': 'rgb(2 6 23 / 56%)',

  'font.family.sans': 'Inter, Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'font.weight.regular': '400',
  'font.weight.medium': '500',
  'font.weight.semibold': '600',
  'font.weight.bold': '700',

  'type.scale.display.lg.fontSize': '40px',
  'type.scale.display.lg.lineHeight': '48px',
  'type.scale.display.lg.fontWeight': '700',
  'type.scale.display.md.fontSize': '32px',
  'type.scale.display.md.lineHeight': '40px',
  'type.scale.display.md.fontWeight': '700',
  'type.scale.heading.xl.fontSize': '28px',
  'type.scale.heading.xl.lineHeight': '36px',
  'type.scale.heading.xl.fontWeight': '700',
  'type.scale.heading.lg.fontSize': '24px',
  'type.scale.heading.lg.lineHeight': '32px',
  'type.scale.heading.lg.fontWeight': '700',
  'type.scale.heading.md.fontSize': '20px',
  'type.scale.heading.md.lineHeight': '28px',
  'type.scale.heading.md.fontWeight': '700',
  'type.scale.heading.sm.fontSize': '18px',
  'type.scale.heading.sm.lineHeight': '26px',
  'type.scale.heading.sm.fontWeight': '600',
  'type.scale.body.lg.fontSize': '18px',
  'type.scale.body.lg.lineHeight': '28px',
  'type.scale.body.lg.fontWeight': '400',
  'type.scale.body.md.fontSize': '16px',
  'type.scale.body.md.lineHeight': '24px',
  'type.scale.body.md.fontWeight': '400',
  'type.scale.body.sm.fontSize': '14px',
  'type.scale.body.sm.lineHeight': '20px',
  'type.scale.body.sm.fontWeight': '400',
  'type.scale.label.md.fontSize': '14px',
  'type.scale.label.md.lineHeight': '20px',
  'type.scale.label.md.fontWeight': '600',
  'type.scale.label.sm.fontSize': '12px',
  'type.scale.label.sm.lineHeight': '16px',
  'type.scale.label.sm.fontWeight': '600',
  'type.scale.numeric.price.lg.fontSize': '24px',
  'type.scale.numeric.price.lg.lineHeight': '30px',
  'type.scale.numeric.price.lg.fontWeight': '700',
  'type.scale.numeric.price.lg.fontVariantNumeric': 'tabular-nums',
  'type.scale.numeric.price.md.fontSize': '18px',
  'type.scale.numeric.price.md.lineHeight': '24px',
  'type.scale.numeric.price.md.fontWeight': '700',
  'type.scale.numeric.price.md.fontVariantNumeric': 'tabular-nums',
  'type.scale.numeric.tabular.fontWeight': '600',
  'type.scale.numeric.tabular.fontVariantNumeric': 'tabular-nums',

  'space.0': '0',
  'space.1': '4px',
  'space.2': '8px',
  'space.3': '12px',
  'space.4': '16px',
  'space.5': '20px',
  'space.6': '24px',
  'space.8': '32px',
  'space.10': '40px',
  'space.12': '48px',
  'space.16': '64px',
  'space.20': '80px',

  'density.comfortable.control.paddingY': '12px',
  'density.comfortable.card.padding': '24px',
  'density.comfortable.section.gap': '32px',
  'density.comfortable.row.height': '56px',
  'density.comfortable.metadata.gap': '12px',
  'density.compact.control.paddingY': '8px',
  'density.compact.card.padding': '16px',
  'density.compact.section.gap': '20px',
  'density.compact.row.height': '44px',
  'density.compact.metadata.gap': '8px',
  'density.action.control.paddingY': '16px',
  'density.action.card.padding': '24px',
  'density.action.section.gap': '24px',
  'density.action.row.height': '64px',
  'density.action.metadata.gap': '12px',

  'size.target.default': '44px',
  'size.target.action': '48px',
  'bp.xs': '0px',
  'bp.sm': '480px',
  'bp.md': '768px',
  'bp.lg': '1024px',
  'bp.xl': '1280px',
  'bp.2xl': '1440px',
  'radius.none': '0',
  'radius.sm': '4px',
  'radius.md': '8px',
  'radius.lg': '12px',
  'radius.full': '999px',
  'border.thin': '1px',
  'border.strong': '2px',
  'border.focus': '2px',
  'shadow.none': 'none',
  'shadow.sm': '0 1px 2px rgb(15 23 42 / 6%)',
  'shadow.md': '0 4px 12px rgb(15 23 42 / 10%)',
  'shadow.lg': '0 12px 32px rgb(15 23 42 / 14%)',
  'focus.ring.width': '2px',
  'focus.ring.offset': '2px',
  'focus.ring.style': 'solid',
  'motion.duration.micro': '140ms',
  'motion.duration.popover': '160ms',
  'motion.duration.overlay': '220ms',
  'motion.duration.page': '240ms',
  'motion.easing.standard': 'cubic-bezier(0.2, 0, 0, 1)',
  'motion.easing.exit': 'cubic-bezier(0.4, 0, 1, 1)',
} as const);

export const semanticTokenAliases = deepFreeze({
  'color.text.primary': 'color.neutral.900',
  'color.text.secondary': 'color.neutral.600',
  'color.text.muted': 'color.neutral.500',
  'color.text.inverse': 'color.neutral.0',
  'color.text.link': 'color.functional.info.default',
  'color.text.disabled': 'color.neutral.400',
  'color.surface.page': 'color.neutral.50',
  'color.surface.primary': 'color.neutral.0',
  'color.surface.secondary': 'color.neutral.100',
  'color.surface.elevated': 'color.neutral.0',
  'color.surface.selected': 'color.brand.50',
  'color.surface.disabled': 'color.neutral.100',
  'color.surface.scrim': 'color.neutral.950.scrim',
  'color.border.default': 'color.neutral.200',
  'color.border.strong': 'color.neutral.300',
  'color.border.disabled': 'color.neutral.300',
  'color.border.focus': 'focus.ring.color',
  'color.action.primary.background': 'color.neutral.900',
  'color.action.primary.foreground': 'color.neutral.0',
  'color.action.secondary.background': 'color.neutral.0',
  'color.action.secondary.foreground': 'color.neutral.900',
  'color.action.secondary.border': 'color.neutral.300',
  'color.action.danger.background': 'color.functional.danger.default',
  'color.action.danger.foreground': 'color.neutral.0',
  'color.action.disabled.background': 'color.neutral.100',
  'color.action.disabled.foreground': 'color.neutral.400',
  'color.action.disabled.border': 'color.neutral.300',
  'color.status.info.foreground': 'color.functional.info.strong',
  'color.status.info.accent': 'color.functional.info.default',
  'color.status.info.background': 'color.functional.info.background',
  'color.status.info.border': 'color.functional.info.border',
  'color.status.success.foreground': 'color.functional.success.strong',
  'color.status.success.accent': 'color.functional.success.default',
  'color.status.success.background': 'color.functional.success.background',
  'color.status.success.border': 'color.functional.success.border',
  'color.status.warning.foreground': 'color.functional.warning.strong',
  'color.status.warning.accent': 'color.functional.warning.default',
  'color.status.warning.background': 'color.functional.warning.background',
  'color.status.warning.border': 'color.functional.warning.border',
  'color.status.danger.foreground': 'color.functional.danger.strong',
  'color.status.danger.accent': 'color.functional.danger.default',
  'color.status.danger.background': 'color.functional.danger.background',
  'color.status.danger.border': 'color.functional.danger.border',
  'color.status.processing.foreground': 'color.functional.processing.strong',
  'color.status.processing.accent': 'color.functional.processing.default',
  'color.status.processing.background': 'color.functional.processing.background',
  'color.status.processing.border': 'color.functional.processing.border',
  'focus.ring.color': 'color.functional.info.default',
  'elevation.base': 'shadow.none',
  'elevation.sticky': 'shadow.sm',
  'elevation.overlay': 'shadow.md',
  'elevation.modal': 'shadow.lg',
  'type.page.title.fontSize': 'type.scale.heading.xl.fontSize',
  'type.page.title.lineHeight': 'type.scale.heading.xl.lineHeight',
  'type.page.title.fontWeight': 'type.scale.heading.xl.fontWeight',
  'type.section.title.fontSize': 'type.scale.heading.lg.fontSize',
  'type.section.title.lineHeight': 'type.scale.heading.lg.lineHeight',
  'type.section.title.fontWeight': 'type.scale.heading.lg.fontWeight',
  'type.subsection.title.fontSize': 'type.scale.heading.md.fontSize',
  'type.subsection.title.lineHeight': 'type.scale.heading.md.lineHeight',
  'type.subsection.title.fontWeight': 'type.scale.heading.md.fontWeight',
  'type.body.default.fontSize': 'type.scale.body.md.fontSize',
  'type.body.default.lineHeight': 'type.scale.body.md.lineHeight',
  'type.body.default.fontWeight': 'type.scale.body.md.fontWeight',
  'type.body.lead.fontSize': 'type.scale.body.lg.fontSize',
  'type.body.lead.lineHeight': 'type.scale.body.lg.lineHeight',
  'type.body.lead.fontWeight': 'type.scale.body.lg.fontWeight',
  'type.body.support.fontSize': 'type.scale.body.sm.fontSize',
  'type.body.support.lineHeight': 'type.scale.body.sm.lineHeight',
  'type.body.support.fontWeight': 'type.scale.body.sm.fontWeight',
  'type.control.label.fontSize': 'type.scale.label.md.fontSize',
  'type.control.label.lineHeight': 'type.scale.label.md.lineHeight',
  'type.control.label.fontWeight': 'type.scale.label.md.fontWeight',
  'type.status.label.fontSize': 'type.scale.label.md.fontSize',
  'type.status.label.lineHeight': 'type.scale.label.md.lineHeight',
  'type.status.label.fontWeight': 'type.scale.label.md.fontWeight',
  'type.compact.label.fontSize': 'type.scale.label.sm.fontSize',
  'type.compact.label.lineHeight': 'type.scale.label.sm.lineHeight',
  'type.compact.label.fontWeight': 'type.scale.label.sm.fontWeight',
  'type.price.primary.fontSize': 'type.scale.numeric.price.lg.fontSize',
  'type.price.primary.lineHeight': 'type.scale.numeric.price.lg.lineHeight',
  'type.price.primary.fontWeight': 'type.scale.numeric.price.lg.fontWeight',
  'type.price.primary.fontVariantNumeric': 'type.scale.numeric.price.lg.fontVariantNumeric',
  'type.price.secondary.fontSize': 'type.scale.numeric.price.md.fontSize',
  'type.price.secondary.lineHeight': 'type.scale.numeric.price.md.lineHeight',
  'type.price.secondary.fontWeight': 'type.scale.numeric.price.md.fontWeight',
  'type.price.secondary.fontVariantNumeric': 'type.scale.numeric.price.md.fontVariantNumeric',
  'type.numeric.tabular.fontWeight': 'type.scale.numeric.tabular.fontWeight',
  'type.numeric.tabular.fontVariantNumeric': 'type.scale.numeric.tabular.fontVariantNumeric',
} as const);

export type CoreTokenName = keyof typeof coreTokenValues;
export type SemanticTokenName = keyof typeof semanticTokenAliases;
export type TokenName = CoreTokenName | SemanticTokenName;

export interface TokenRegistry {
  readonly core: Readonly<Record<string, string>>;
  readonly aliases: Readonly<Record<string, string>>;
}

export const tokenRegistry = deepFreeze({
  core: coreTokenValues,
  aliases: semanticTokenAliases,
} satisfies TokenRegistry);

export const requiredSemanticTokenNames = deepFreeze(
  Object.keys(semanticTokenAliases).sort() as SemanticTokenName[],
);

export function resolveTokenValue(name: string, registry: TokenRegistry = tokenRegistry): string {
  const visited = new Set<string>();
  let current = name;
  while (true) {
    if (visited.has(current)) throw new Error(`Token alias cycle detected at ${current}`);
    visited.add(current);
    const core = registry.core[current];
    if (core !== undefined) return core;
    const alias = registry.aliases[current];
    if (alias === undefined) throw new Error(`Unknown token reference: ${current}`);
    current = alias;
  }
}

export function toCssVariableName(name: string): `--noma-${string}` {
  const suffix = name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replaceAll('.', '-')
    .toLowerCase();
  return `--noma-${suffix}`;
}

export function createCssTokenDeclarations(
  registry: TokenRegistry = tokenRegistry,
): Readonly<Record<`--noma-${string}`, string>> {
  const declarations: Record<`--noma-${string}`, string> = {};
  for (const [name, value] of Object.entries(registry.core).sort(([left], [right]) => left.localeCompare(right))) {
    declarations[toCssVariableName(name)] = value;
  }
  for (const [name, target] of Object.entries(registry.aliases).sort(([left], [right]) => left.localeCompare(right))) {
    declarations[toCssVariableName(name)] = `var(${toCssVariableName(target)})`;
  }
  return deepFreeze(declarations);
}

export const resolvedTokenValues = deepFreeze(
  Object.fromEntries(
    [...Object.keys(coreTokenValues), ...Object.keys(semanticTokenAliases)]
      .sort()
      .map((name) => [name, resolveTokenValue(name)]),
  ) as Record<TokenName, string>,
);
