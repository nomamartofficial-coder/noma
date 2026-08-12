import { componentTokenAliases } from './component-tokens.js';
import { toCssVariableName, tokenRegistry } from './tokens.js';

function deepFreeze<const T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

/** Commerce-pattern decisions layered on Noma's existing semantic authority. */
export const commerceTokenAliases = deepFreeze({
  'commerce.status.paddingX': 'space.3',
  'commerce.status.paddingY': 'space.1',
  'commerce.status.gap': 'space.2',
  'commerce.status.radius': 'radius.full',
  'commerce.status.borderWidth': 'border.thin',
  'commerce.status.fontSize': 'type.status.label.fontSize',
  'commerce.status.fontWeight': 'type.status.label.fontWeight',
  'commerce.status.info.background': 'color.status.info.background',
  'commerce.status.info.foreground': 'color.status.info.foreground',
  'commerce.status.info.border': 'color.status.info.border',
  'commerce.status.processing.background': 'color.status.processing.background',
  'commerce.status.processing.foreground': 'color.status.processing.foreground',
  'commerce.status.processing.border': 'color.status.processing.border',
  'commerce.status.success.background': 'color.status.success.background',
  'commerce.status.success.foreground': 'color.status.success.foreground',
  'commerce.status.success.border': 'color.status.success.border',
  'commerce.status.warning.background': 'color.status.warning.background',
  'commerce.status.warning.foreground': 'color.status.warning.foreground',
  'commerce.status.warning.border': 'color.status.warning.border',
  'commerce.status.danger.background': 'color.status.danger.background',
  'commerce.status.danger.foreground': 'color.status.danger.foreground',
  'commerce.status.danger.border': 'color.status.danger.border',
  'commerce.panel.background': 'color.surface.primary',
  'commerce.panel.foreground': 'color.text.primary',
  'commerce.panel.muted': 'color.text.secondary',
  'commerce.panel.border': 'color.border.default',
  'commerce.panel.radius': 'radius.lg',
  'commerce.panel.padding': 'space.4',
  'commerce.panel.gap': 'space.3',
  'commerce.banner.info.border': 'color.status.info.border',
  'commerce.banner.warning.border': 'color.status.warning.border',
  'commerce.banner.danger.border': 'color.status.danger.border',
  'commerce.banner.processing.border': 'color.status.processing.border',
  'commerce.banner.success.border': 'color.status.success.border',
  'commerce.money.fontWeight': 'type.price.secondary.fontWeight',
  'commerce.money.fontVariantNumeric': 'type.numeric.tabular.fontVariantNumeric',
  'commerce.money.totalFontSize': 'type.price.secondary.fontSize',
  'commerce.money.negative': 'color.status.danger.foreground',
  'commerce.timeline.connector': 'color.border.strong',
  'commerce.timeline.marker': 'color.status.info.accent',
  'commerce.timeline.gap': 'space.4',
  'commerce.evidence.background': 'color.surface.secondary',
  'commerce.highRisk.border': 'color.status.danger.border',
  'commerce.highRisk.background': 'color.status.danger.background',
  'commerce.highRisk.foreground': 'color.status.danger.foreground',
  'commerce.highRisk.actionTarget': 'component.action.target',
  'commerce.motion.duration': 'component.motion.duration',
  'commerce.motion.easing': 'component.motion.easing',
} as const);

export type CommerceTokenName = keyof typeof commerceTokenAliases;
export const requiredCommerceTokenNames = deepFreeze(
  Object.keys(commerceTokenAliases).sort() as CommerceTokenName[],
);

export function createCommerceTokenDeclarations(): Readonly<Record<`--noma-${string}`, string>> {
  const knownTokens = new Set([
    ...Object.keys(tokenRegistry.core),
    ...Object.keys(tokenRegistry.aliases),
    ...Object.keys(componentTokenAliases),
  ]);
  const declarations: Record<`--noma-${string}`, string> = {};
  for (const [name, target] of Object.entries(commerceTokenAliases).sort(([a], [b]) => a.localeCompare(b))) {
    if (!knownTokens.has(target)) throw new Error(`Unknown commerce token reference: ${name} -> ${target}`);
    declarations[toCssVariableName(name)] = `var(${toCssVariableName(target)})`;
  }
  return Object.freeze(declarations);
}
