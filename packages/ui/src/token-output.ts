import { createCssTokenDeclarations } from './tokens.js';
import { createComponentTokenDeclarations } from './component-tokens.js';
export { renderCommerceCss } from './commerce-output.js';

const GENERATED_HEADER = `/* Generated from packages/ui/src/tokens.ts. Do not edit by hand. */`;

function renderRootDeclarations(): string {
  const declarations = Object.entries(createCssTokenDeclarations())
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return `:root {\n  color-scheme: light;\n${declarations}\n}`;
}

export function renderTokenCss(): string {
  return `${GENERATED_HEADER}\n${renderRootDeclarations()}\n`;
}

export function renderFoundationCss(): string {
  return `${GENERATED_HEADER}
${renderRootDeclarations()}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  color-scheme: light;
}

body {
  margin: 0;
  background: var(--noma-color-surface-page);
  color: var(--noma-color-text-primary);
  font-family: var(--noma-font-family-sans);
  font-size: var(--noma-type-body-default-font-size);
  font-weight: var(--noma-type-body-default-font-weight);
  line-height: var(--noma-type-body-default-line-height);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --noma-motion-duration-micro: 0ms;
    --noma-motion-duration-popover: 0ms;
    --noma-motion-duration-overlay: 0ms;
    --noma-motion-duration-page: 0ms;
  }
}

@media (forced-colors: active) {
  :root {
    --noma-focus-ring-color: Highlight;
    --noma-color-border-focus: Highlight;
  }
}
`;
}

function renderComponentDeclarations(): string {
  return Object.entries(createComponentTokenDeclarations())
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
}

export function renderComponentCss(): string {
  return `${GENERATED_HEADER.replace('tokens.ts', 'component-tokens.ts')}
:root {
${renderComponentDeclarations()}
}

${COMPONENT_STYLES}`;
}

const COMPONENT_STYLES = String.raw`/* Noma-owned primitive presentation. Base UI is implementation-only. */
.noma-button,
.noma-icon-button,
.noma-link,
.noma-input,
.noma-textarea,
.noma-select-trigger,
.noma-checkbox,
.noma-radio,
.noma-dialog-close,
.noma-menu-trigger,
.noma-menu-item,
.noma-pagination-link,
.noma-toast-action,
.noma-toast-close {
  -webkit-tap-highlight-color: transparent;
}

.noma-button,
.noma-icon-button,
.noma-select-trigger,
.noma-menu-trigger,
.noma-dialog-close,
.noma-toast-action,
.noma-toast-close {
  align-items: center;
  border: var(--noma-component-control-border-width) solid transparent;
  border-radius: var(--noma-component-control-radius);
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-weight: var(--noma-component-control-font-weight);
  gap: var(--noma-component-control-gap);
  justify-content: center;
  min-height: var(--noma-component-control-target);
  padding: var(--noma-component-control-padding-y) var(--noma-component-control-padding-x);
  text-decoration: none;
  transition: background-color var(--noma-component-motion-duration) var(--noma-component-motion-easing), border-color var(--noma-component-motion-duration) var(--noma-component-motion-easing), color var(--noma-component-motion-duration) var(--noma-component-motion-easing), transform var(--noma-component-motion-duration) var(--noma-component-motion-easing);
}

.noma-button[data-size='action'] { min-height: var(--noma-component-action-target); }
.noma-button[data-variant='primary'] { background: var(--noma-component-button-primary-background); color: var(--noma-component-button-primary-foreground); }
.noma-button[data-variant='secondary'], .noma-menu-trigger { background: var(--noma-component-button-secondary-background); border-color: var(--noma-component-button-secondary-border); color: var(--noma-component-button-secondary-foreground); }
.noma-button[data-variant='danger'] { background: var(--noma-component-button-danger-background); color: var(--noma-component-button-danger-foreground); }
.noma-button[data-variant='success'] { background: var(--noma-component-button-success-background); color: var(--noma-component-button-success-foreground); }
.noma-icon-button { background: var(--noma-component-button-secondary-background); border-color: var(--noma-component-button-secondary-border); color: var(--noma-component-button-secondary-foreground); min-width: var(--noma-component-control-target); padding: var(--noma-component-control-padding-y); }
.noma-button[data-pending]::before { animation: noma-spin 800ms linear infinite; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; content: ''; height: 1em; width: 1em; }

.noma-button[data-disabled], .noma-icon-button[data-disabled], .noma-select-trigger[data-disabled], .noma-checkbox[data-disabled], .noma-radio[data-disabled] { background: var(--noma-component-control-disabled-background); border-color: var(--noma-component-control-disabled-border); color: var(--noma-component-control-disabled-foreground); cursor: not-allowed; }

.noma-link { border-radius: var(--noma-component-focus-radius); color: var(--noma-component-link-foreground); min-height: var(--noma-component-control-target); text-decoration: underline; text-decoration-thickness: max(1px, .08em); text-underline-offset: .18em; }
.noma-link[data-standalone] { align-items: center; display: inline-flex; padding-inline: var(--noma-space-2); }

.noma-field { display: grid; gap: var(--noma-space-1); }
.noma-field-label, .noma-field-legend { color: var(--noma-color-text-primary); font-size: var(--noma-type-control-label-font-size); font-weight: var(--noma-type-control-label-font-weight); line-height: var(--noma-type-control-label-line-height); }
.noma-field-description { color: var(--noma-component-field-description); font-size: var(--noma-type-body-support-font-size); margin: 0; }
.noma-field-error { color: var(--noma-component-field-error); font-size: var(--noma-type-body-support-font-size); font-weight: var(--noma-font-weight-medium); margin: 0; }
.noma-required-marker { color: var(--noma-component-field-error); }
.noma-input, .noma-textarea, .noma-select-trigger { background: var(--noma-component-field-background); border: var(--noma-component-control-border-width) solid var(--noma-component-field-border); border-radius: var(--noma-component-control-radius); color: var(--noma-component-field-foreground); font: inherit; min-height: var(--noma-component-control-target); padding: var(--noma-component-control-padding-y) var(--noma-component-control-padding-x); width: 100%; }
.noma-textarea { min-height: 112px; resize: vertical; }
.noma-input::placeholder, .noma-textarea::placeholder { color: var(--noma-component-field-placeholder); opacity: 1; }
.noma-input[aria-invalid='true'], .noma-textarea[aria-invalid='true'], .noma-select-trigger[aria-invalid='true'] { border-color: var(--noma-component-field-error); }
.noma-input:disabled, .noma-textarea:disabled { background: var(--noma-component-control-disabled-background); color: var(--noma-component-control-disabled-foreground); cursor: not-allowed; }
.noma-input:read-only, .noma-textarea:read-only { background: var(--noma-color-surface-secondary); }
.noma-select-trigger { justify-content: space-between; }
.noma-select-positioner, .noma-menu-positioner { outline: 0; z-index: 60; }
.noma-select-popup, .noma-menu-popup { background: var(--noma-component-overlay-background); border: var(--noma-border-thin) solid var(--noma-component-overlay-border); border-radius: var(--noma-radius-md); box-shadow: var(--noma-component-overlay-shadow); color: var(--noma-color-text-primary); max-height: min(320px, var(--available-height)); min-width: var(--anchor-width); overflow: auto; padding: var(--noma-space-1); transform-origin: var(--transform-origin); transition: opacity var(--noma-component-motion-popover-duration) var(--noma-component-motion-easing), transform var(--noma-component-motion-popover-duration) var(--noma-component-motion-easing); }
.noma-select-popup[data-starting-style], .noma-select-popup[data-ending-style], .noma-menu-popup[data-starting-style], .noma-menu-popup[data-ending-style] { opacity: 0; transform: scale(.98); }
.noma-select-item, .noma-menu-item { align-items: center; border-radius: var(--noma-radius-sm); color: var(--noma-color-text-primary); cursor: pointer; display: flex; gap: var(--noma-space-2); min-height: var(--noma-component-control-target); outline: 0; padding: var(--noma-space-2) var(--noma-space-3); user-select: none; }
.noma-select-item[data-highlighted], .noma-menu-item[data-highlighted] { background: var(--noma-component-option-highlight-background); }
.noma-select-item[data-disabled], .noma-menu-item[data-disabled] { color: var(--noma-component-control-disabled-foreground); cursor: not-allowed; }
.noma-menu-item[data-tone='danger'] { color: var(--noma-color-status-danger-foreground); }
.noma-select-item-indicator { width: 1em; }

.noma-choice-row { align-items: flex-start; color: var(--noma-color-text-primary); cursor: pointer; display: flex; gap: var(--noma-space-2); min-height: var(--noma-component-control-target); padding-block: var(--noma-space-2); }
.noma-checkbox, .noma-radio { align-items: center; background: var(--noma-component-field-background); border: var(--noma-border-strong) solid var(--noma-component-field-border); color: var(--noma-color-text-inverse); display: inline-flex; flex: 0 0 auto; height: 22px; justify-content: center; margin-top: 1px; width: 22px; }
.noma-checkbox { border-radius: var(--noma-radius-sm); }
.noma-radio { border-radius: var(--noma-radius-full); }
.noma-checkbox[data-checked], .noma-radio[data-checked] { background: var(--noma-component-choice-checked-background); border-color: var(--noma-component-choice-checked-background); }
.noma-checkbox-indicator, .noma-radio-indicator { font-size: 14px; line-height: 1; }
.noma-radio-indicator { background: currentColor; border-radius: 50%; height: 8px; width: 8px; }
.noma-radio-group { border: 0; display: grid; gap: var(--noma-space-1); margin: 0; padding: 0; }

.noma-dialog-backdrop { background: var(--noma-component-overlay-scrim); inset: 0; position: fixed; transition: opacity var(--noma-component-motion-overlay-duration) var(--noma-component-motion-easing); z-index: 70; }
.noma-dialog-backdrop[data-starting-style], .noma-dialog-backdrop[data-ending-style] { opacity: 0; }
.noma-dialog-popup { background: var(--noma-component-overlay-background); border: var(--noma-border-thin) solid var(--noma-component-overlay-border); border-radius: var(--noma-radius-lg); box-shadow: var(--noma-component-modal-shadow); color: var(--noma-color-text-primary); left: 50%; margin: 0; max-height: calc(100dvh - var(--noma-space-8)); max-width: calc(100vw - var(--noma-space-8)); overflow: auto; padding: var(--noma-space-6); position: fixed; top: 50%; transform: translate(-50%, -50%); transition: opacity var(--noma-component-motion-overlay-duration) var(--noma-component-motion-easing), transform var(--noma-component-motion-overlay-duration) var(--noma-component-motion-easing); width: min(560px, calc(100vw - var(--noma-space-8))); z-index: 71; }
.noma-dialog-popup[data-starting-style], .noma-dialog-popup[data-ending-style] { opacity: 0; transform: translate(-50%, calc(-50% + 8px)); }
.noma-dialog-popup[data-kind='drawer'] { border-radius: var(--noma-radius-lg) 0 0 var(--noma-radius-lg); bottom: 0; left: auto; max-height: 100dvh; max-width: min(440px, 100vw); right: 0; top: 0; transform: none; width: min(440px, 100vw); }
.noma-dialog-popup[data-kind='drawer'][data-starting-style], .noma-dialog-popup[data-kind='drawer'][data-ending-style] { opacity: 1; transform: translateX(100%); }
.noma-dialog-popup[data-kind='drawer'][data-side='left'] { border-radius: 0 var(--noma-radius-lg) var(--noma-radius-lg) 0; left: 0; right: auto; }
.noma-dialog-popup[data-kind='drawer'][data-side='left'][data-starting-style], .noma-dialog-popup[data-kind='drawer'][data-side='left'][data-ending-style] { transform: translateX(-100%); }
.noma-dialog-popup[data-kind='drawer'][data-side='bottom'] { border-radius: var(--noma-radius-lg) var(--noma-radius-lg) 0 0; height: auto; left: 0; max-width: 100vw; right: 0; top: auto; width: 100vw; }
.noma-dialog-popup[data-kind='drawer'][data-side='bottom'][data-starting-style], .noma-dialog-popup[data-kind='drawer'][data-side='bottom'][data-ending-style] { transform: translateY(100%); }
.noma-dialog-header { display: grid; gap: var(--noma-space-2); padding-right: var(--noma-space-12); }
.noma-dialog-title { font-size: var(--noma-type-subsection-title-font-size); font-weight: var(--noma-type-subsection-title-font-weight); line-height: var(--noma-type-subsection-title-line-height); margin: 0; }
.noma-dialog-description { color: var(--noma-color-text-secondary); margin: 0; }
.noma-dialog-body { margin-top: var(--noma-space-5); }
.noma-dialog-footer { display: flex; flex-wrap: wrap; gap: var(--noma-space-2); justify-content: flex-end; margin-top: var(--noma-space-6); }
.noma-dialog-close { background: transparent; color: var(--noma-color-text-primary); min-width: var(--noma-component-control-target); padding: var(--noma-space-2); position: absolute; right: var(--noma-space-3); top: var(--noma-space-3); }

.noma-tabs-list { border-bottom: var(--noma-border-thin) solid var(--noma-color-border-default); display: flex; gap: var(--noma-space-1); overflow-x: auto; }
.noma-tab { background: transparent; border: 0; border-bottom: var(--noma-border-strong) solid transparent; color: var(--noma-color-text-secondary); cursor: pointer; font: inherit; font-weight: var(--noma-font-weight-semibold); min-height: var(--noma-component-control-target); padding: var(--noma-space-2) var(--noma-space-3); }
.noma-tab[data-active] { border-bottom-color: var(--noma-component-tab-active-border); color: var(--noma-component-tab-active-foreground); }
.noma-tab-panel { padding-block: var(--noma-space-4); }
.noma-tab-panel[hidden] { display: none; }

.noma-table-scroll { max-width: 100%; overflow-x: auto; }
.noma-table { border-collapse: collapse; color: var(--noma-color-text-primary); min-width: 100%; }
.noma-table caption { color: var(--noma-color-text-secondary); padding: var(--noma-space-2); text-align: left; }
.noma-table th, .noma-table td { border-bottom: var(--noma-border-thin) solid var(--noma-color-border-default); padding: var(--noma-space-3); text-align: left; vertical-align: top; }
.noma-table[data-density='comfortable'] th, .noma-table[data-density='comfortable'] td { height: var(--noma-density-comfortable-row-height); }
.noma-table[data-density='compact'] th, .noma-table[data-density='compact'] td { height: var(--noma-density-compact-row-height); padding-block: var(--noma-space-2); }
.noma-table th { font-weight: var(--noma-font-weight-semibold); }

.noma-pagination { align-items: center; display: flex; flex-wrap: wrap; gap: var(--noma-space-1); }
.noma-pagination-list { display: flex; flex-wrap: wrap; gap: var(--noma-space-1); list-style: none; margin: 0; padding: 0; }
.noma-pagination-link { align-items: center; border: var(--noma-border-thin) solid var(--noma-color-border-default); border-radius: var(--noma-radius-md); color: var(--noma-color-text-primary); display: inline-flex; justify-content: center; min-height: var(--noma-component-control-target); min-width: var(--noma-component-control-target); padding: var(--noma-space-2); text-decoration: none; }
.noma-pagination-link[aria-current='page'] { background: var(--noma-component-option-highlight-background); border-color: var(--noma-color-border-strong); font-weight: var(--noma-font-weight-semibold); }
.noma-pagination-link[aria-disabled='true'] { color: var(--noma-component-control-disabled-foreground); cursor: not-allowed; }
.noma-pagination-ellipsis { align-items: center; display: inline-flex; min-height: var(--noma-component-control-target); padding-inline: var(--noma-space-2); }

.noma-form-error-summary { background: var(--noma-color-status-danger-background); border: var(--noma-border-thin) solid var(--noma-color-status-danger-border); border-radius: var(--noma-radius-md); color: var(--noma-color-status-danger-foreground); margin-bottom: var(--noma-space-4); padding: var(--noma-space-4); }
.noma-form-error-summary h2 { font-size: var(--noma-type-subsection-title-font-size); margin: 0 0 var(--noma-space-2); }
.noma-form-error-summary ul { margin-bottom: 0; }
.noma-form-error-summary a { color: inherit; min-height: var(--noma-component-control-target); }

.noma-toast-viewport { bottom: var(--noma-space-4); display: flex; flex-direction: column-reverse; gap: var(--noma-space-2); margin: 0; max-width: calc(100vw - var(--noma-space-8)); outline: 0; padding: 0; position: fixed; right: var(--noma-space-4); width: 360px; z-index: 80; }
.noma-toast { background: var(--noma-component-overlay-background); border: var(--noma-border-thin) solid var(--noma-component-overlay-border); border-left: var(--noma-border-strong) solid var(--noma-color-status-info-accent); border-radius: var(--noma-radius-md); box-shadow: var(--noma-component-overlay-shadow); color: var(--noma-color-text-primary); padding: var(--noma-space-4); transition: opacity var(--noma-component-motion-popover-duration) var(--noma-component-motion-easing), transform var(--noma-component-motion-popover-duration) var(--noma-component-motion-easing); }
.noma-toast[data-type='success'] { border-left-color: var(--noma-color-status-success-accent); }
.noma-toast[data-type='warning'] { border-left-color: var(--noma-color-status-warning-accent); }
.noma-toast[data-type='danger'] { border-left-color: var(--noma-color-status-danger-accent); }
.noma-toast[data-starting-style], .noma-toast[data-ending-style] { opacity: 0; transform: translateY(8px); }
.noma-toast-title { font-weight: var(--noma-font-weight-semibold); }
.noma-toast-description { color: var(--noma-color-text-secondary); margin-top: var(--noma-space-1); }
.noma-toast-controls { display: flex; gap: var(--noma-space-2); margin-top: var(--noma-space-3); }
.noma-toast-action, .noma-toast-close { background: var(--noma-component-button-secondary-background); border-color: var(--noma-component-button-secondary-border); color: var(--noma-component-button-secondary-foreground); }

.noma-button:focus-visible, .noma-icon-button:focus-visible, .noma-link:focus-visible, .noma-input:focus-visible, .noma-textarea:focus-visible, .noma-select-trigger:focus-visible, .noma-checkbox:focus-visible, .noma-radio:focus-visible, .noma-dialog-popup:focus-visible, .noma-dialog-close:focus-visible, .noma-tab:focus-visible, .noma-menu-trigger:focus-visible, .noma-menu-item:focus-visible, .noma-pagination-link:focus-visible, .noma-toast-action:focus-visible, .noma-toast-close:focus-visible, .noma-form-error-summary:focus-visible {
  outline: var(--noma-border-focus) solid var(--noma-focus-ring-color);
  outline-offset: var(--noma-space-1);
}

@keyframes noma-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .noma-button, .noma-icon-button, .noma-select-trigger, .noma-select-popup, .noma-menu-popup, .noma-dialog-backdrop, .noma-dialog-popup, .noma-toast { animation: none !important; scroll-behavior: auto; transition-duration: 0ms; }
}

@media (forced-colors: active) {
  .noma-button, .noma-icon-button, .noma-input, .noma-textarea, .noma-select-trigger, .noma-checkbox, .noma-radio, .noma-dialog-popup, .noma-menu-popup, .noma-select-popup, .noma-pagination-link, .noma-toast { border-color: CanvasText; }
  .noma-button[data-disabled], .noma-icon-button[data-disabled], .noma-checkbox[data-disabled], .noma-radio[data-disabled] { color: GrayText; }
  .noma-checkbox[data-checked], .noma-radio[data-checked], .noma-tab[data-active] { forced-color-adjust: auto; }
}
`;
