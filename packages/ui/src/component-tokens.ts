import { toCssVariableName, tokenRegistry } from './tokens.js';

function deepFreeze<const T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

/**
 * Component-level decisions. Colour entries intentionally reference UI-001
 * semantic tokens so components cannot invent business or status meaning.
 */
export const componentTokenAliases = deepFreeze({
  'component.control.target': 'size.target.default',
  'component.action.target': 'size.target.action',
  'component.control.paddingX': 'space.4',
  'component.control.paddingY': 'space.2',
  'component.control.gap': 'space.2',
  'component.control.radius': 'radius.md',
  'component.control.borderWidth': 'border.thin',
  'component.control.fontWeight': 'font.weight.semibold',
  'component.focus.radius': 'radius.sm',
  'component.motion.duration': 'motion.duration.micro',
  'component.motion.popoverDuration': 'motion.duration.popover',
  'component.motion.overlayDuration': 'motion.duration.overlay',
  'component.motion.easing': 'motion.easing.standard',
  'component.button.primary.background': 'color.action.primary.background',
  'component.button.primary.foreground': 'color.action.primary.foreground',
  'component.button.secondary.background': 'color.action.secondary.background',
  'component.button.secondary.foreground': 'color.action.secondary.foreground',
  'component.button.secondary.border': 'color.action.secondary.border',
  'component.button.danger.background': 'color.action.danger.background',
  'component.button.danger.foreground': 'color.action.danger.foreground',
  'component.button.success.background': 'color.status.success.accent',
  'component.button.success.foreground': 'color.text.inverse',
  'component.link.foreground': 'color.text.link',
  'component.field.background': 'color.surface.primary',
  'component.field.foreground': 'color.text.primary',
  'component.field.border': 'color.border.strong',
  'component.field.placeholder': 'color.text.muted',
  'component.field.description': 'color.text.secondary',
  'component.field.error': 'color.status.danger.foreground',
  'component.control.disabled.background': 'color.action.disabled.background',
  'component.control.disabled.foreground': 'color.action.disabled.foreground',
  'component.control.disabled.border': 'color.action.disabled.border',
  'component.choice.checked.background': 'color.action.primary.background',
  'component.option.highlight.background': 'color.surface.selected',
  'component.tab.active.foreground': 'color.text.primary',
  'component.tab.active.border': 'color.border.focus',
  'component.overlay.background': 'color.surface.elevated',
  'component.overlay.border': 'color.border.default',
  'component.overlay.scrim': 'color.surface.scrim',
  'component.overlay.shadow': 'elevation.overlay',
  'component.modal.shadow': 'elevation.modal',
} as const);

export type ComponentTokenName = keyof typeof componentTokenAliases;
export const requiredComponentTokenNames = deepFreeze(
  Object.keys(componentTokenAliases).sort() as ComponentTokenName[],
);

export function createComponentTokenDeclarations(): Readonly<Record<`--noma-${string}`, string>> {
  const knownTokens = new Set([
    ...Object.keys(tokenRegistry.core),
    ...Object.keys(tokenRegistry.aliases),
  ]);
  const declarations: Record<`--noma-${string}`, string> = {};
  for (const [name, target] of Object.entries(componentTokenAliases).sort(([a], [b]) => a.localeCompare(b))) {
    if (!knownTokens.has(target)) throw new Error(`Unknown component token reference: ${name} -> ${target}`);
    declarations[toCssVariableName(name)] = `var(${toCssVariableName(target)})`;
  }
  return Object.freeze(declarations);
}
