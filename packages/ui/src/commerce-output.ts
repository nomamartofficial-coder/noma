import { createCommerceTokenDeclarations } from './commerce-tokens.js';

const GENERATED_HEADER = '/* Generated from packages/ui/src/commerce-tokens.ts. Do not edit by hand. */';

function renderCommerceDeclarations(): string {
  return Object.entries(createCommerceTokenDeclarations())
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
}

export function renderCommerceCss(): string {
  return `${GENERATED_HEADER}
:root {
${renderCommerceDeclarations()}
}

${COMMERCE_STYLES}`;
}

const COMMERCE_STYLES = String.raw`/* Presentation-only commerce patterns. */
.noma-status-chip {
  align-items: center;
  background: var(--noma-commerce-status-info-background);
  border: var(--noma-commerce-status-border-width) solid var(--noma-commerce-status-info-border);
  border-radius: var(--noma-commerce-status-radius);
  color: var(--noma-commerce-status-info-foreground);
  display: inline-flex;
  font-size: var(--noma-commerce-status-font-size);
  font-weight: var(--noma-commerce-status-font-weight);
  gap: var(--noma-commerce-status-gap);
  line-height: 1.25;
  padding: var(--noma-commerce-status-padding-y) var(--noma-commerce-status-padding-x);
  width: fit-content;
}
.noma-status-chip[data-tone='processing'] { background: var(--noma-commerce-status-processing-background); border-color: var(--noma-commerce-status-processing-border); color: var(--noma-commerce-status-processing-foreground); }
.noma-status-chip[data-tone='success'] { background: var(--noma-commerce-status-success-background); border-color: var(--noma-commerce-status-success-border); color: var(--noma-commerce-status-success-foreground); }
.noma-status-chip[data-tone='warning'] { background: var(--noma-commerce-status-warning-background); border-color: var(--noma-commerce-status-warning-border); color: var(--noma-commerce-status-warning-foreground); }
.noma-status-chip[data-tone='danger'] { background: var(--noma-commerce-status-danger-background); border-color: var(--noma-commerce-status-danger-border); color: var(--noma-commerce-status-danger-foreground); }
.noma-status-chip-icon { align-items: center; display: inline-flex; }

.noma-commerce-status,
.noma-commerce-banner,
.noma-evidence-card {
  background: var(--noma-commerce-panel-background);
  border: var(--noma-commerce-status-border-width) solid var(--noma-commerce-panel-border);
  border-radius: var(--noma-commerce-panel-radius);
  color: var(--noma-commerce-panel-foreground);
  display: grid;
  gap: var(--noma-commerce-panel-gap);
  padding: var(--noma-commerce-panel-padding);
}
.noma-commerce-status { border-inline-start-width: var(--noma-border-strong); }
.noma-commerce-status[data-phase='requested'] { border-inline-start-color: var(--noma-commerce-status-info-border); }
.noma-commerce-status[data-phase='processing'] { border-inline-start-color: var(--noma-commerce-status-processing-border); }
.noma-commerce-status[data-phase='final'] { border-inline-start-color: var(--noma-commerce-status-success-border); }
.noma-commerce-status[data-phase='failed'] { border-inline-start-color: var(--noma-commerce-status-danger-border); }
.noma-commerce-status[data-phase='uncertain'] { border-inline-start-color: var(--noma-commerce-status-warning-border); }
.noma-commerce-status-description { font-weight: var(--noma-font-weight-medium); }
.noma-commerce-status-responsibility,
.noma-commerce-banner-description,
.noma-commerce-status-metadata,
.noma-timeline-metadata,
.noma-timeline-description,
.noma-evidence-summary,
.noma-evidence-metadata { color: var(--noma-commerce-panel-muted); }
.noma-commerce-status-metadata { display: flex; flex-wrap: wrap; gap: var(--noma-space-3); }
.noma-commerce-reference { overflow-wrap: anywhere; }

.noma-commerce-banner { border-inline-start-width: var(--noma-border-strong); }
.noma-commerce-banner[data-tone='info'] { border-inline-start-color: var(--noma-commerce-banner-info-border); }
.noma-commerce-banner[data-tone='processing'] { border-inline-start-color: var(--noma-commerce-banner-processing-border); }
.noma-commerce-banner[data-tone='success'] { border-inline-start-color: var(--noma-commerce-banner-success-border); }
.noma-commerce-banner[data-tone='warning'] { border-inline-start-color: var(--noma-commerce-banner-warning-border); }
.noma-commerce-banner[data-tone='danger'] { border-inline-start-color: var(--noma-commerce-banner-danger-border); }
.noma-commerce-banner-action { font-weight: var(--noma-font-weight-semibold); }
.noma-deadline-banner time { font-variant-numeric: var(--noma-type-numeric-tabular-font-variant-numeric); font-weight: var(--noma-font-weight-semibold); }

.noma-money {
  font-variant-numeric: var(--noma-commerce-money-font-variant-numeric);
  font-weight: var(--noma-commerce-money-font-weight);
  white-space: nowrap;
}
.noma-money-negative { color: var(--noma-commerce-money-negative); }
.noma-money-breakdown { display: grid; gap: var(--noma-space-2); margin: 0; }
.noma-money-breakdown-row { align-items: baseline; display: grid; gap: var(--noma-space-4); grid-template-columns: minmax(0, 1fr) max-content; }
.noma-money-breakdown-row dt, .noma-money-breakdown-row dd { margin: 0; }
.noma-money-breakdown-row dd { text-align: end; }
.noma-money-breakdown-description { color: var(--noma-commerce-panel-muted); display: block; font-size: var(--noma-type-body-support-font-size); font-weight: var(--noma-type-body-support-font-weight); line-height: var(--noma-type-body-support-line-height); }
.noma-money-breakdown-total { border-block-start: var(--noma-border-thin) solid var(--noma-commerce-panel-border); font-size: var(--noma-commerce-money-total-font-size); font-weight: var(--noma-font-weight-bold); margin-block-start: var(--noma-space-2); padding-block-start: var(--noma-space-3); }

.noma-timeline { display: grid; gap: 0; list-style: none; margin: 0; padding: 0; }
.noma-timeline-item { display: grid; gap: var(--noma-space-3); grid-template-columns: var(--noma-space-4) minmax(0, 1fr); position: relative; }
.noma-timeline-item:not(:last-child)::before { background: var(--noma-commerce-timeline-connector); content: ''; inset-block: var(--noma-space-4) 0; inset-inline-start: calc(var(--noma-space-2) - var(--noma-border-thin)); position: absolute; width: var(--noma-border-thin); }
.noma-timeline-marker { background: var(--noma-commerce-timeline-marker); border: var(--noma-border-thin) solid var(--noma-commerce-panel-background); border-radius: var(--noma-radius-full); height: var(--noma-space-3); margin-block-start: var(--noma-space-1); position: relative; width: var(--noma-space-3); z-index: 1; }
.noma-timeline-item[data-state='pending'] .noma-timeline-marker { background: var(--noma-color-status-processing-accent); }
.noma-timeline-item[data-state='confirmed'] .noma-timeline-marker { background: var(--noma-color-status-success-accent); }
.noma-timeline-item[data-state='failed'] .noma-timeline-marker { background: var(--noma-color-status-danger-accent); }
.noma-timeline-item[data-state='superseded'] .noma-timeline-marker { background: var(--noma-color-status-info-accent); }
.noma-timeline-content { display: grid; gap: var(--noma-space-2); padding-block-end: var(--noma-commerce-timeline-gap); }
.noma-timeline-heading { align-items: center; display: flex; flex-wrap: wrap; gap: var(--noma-space-2); justify-content: space-between; }
.noma-timeline-metadata { display: flex; flex-wrap: wrap; font-size: var(--noma-type-body-support-font-size); gap: var(--noma-space-3); }
.noma-timeline-actions { align-items: center; display: flex; flex-wrap: wrap; gap: var(--noma-space-3); }

.noma-evidence-card { background: var(--noma-commerce-evidence-background); }
.noma-evidence-card-header { align-items: start; display: flex; gap: var(--noma-space-3); justify-content: space-between; }
.noma-evidence-card-header h3 { font-size: var(--noma-type-subsection-title-font-size); line-height: var(--noma-type-subsection-title-line-height); margin: var(--noma-space-1) 0 0; }
.noma-evidence-type { color: var(--noma-commerce-panel-muted); font-size: var(--noma-type-compact-label-font-size); font-weight: var(--noma-type-compact-label-font-weight); }
.noma-evidence-metadata { display: grid; gap: var(--noma-space-2); margin: 0; }
.noma-evidence-metadata div { display: grid; gap: var(--noma-space-1); grid-template-columns: minmax(7rem, max-content) minmax(0, 1fr); }
.noma-evidence-metadata dt { font-weight: var(--noma-font-weight-semibold); }
.noma-evidence-metadata dd { margin: 0; overflow-wrap: anywhere; }

.noma-high-risk-summary { display: grid; gap: var(--noma-space-3); margin: 0 0 var(--noma-space-4); }
.noma-high-risk-summary > div { background: var(--noma-commerce-high-risk-background); border-inline-start: var(--noma-border-strong) solid var(--noma-commerce-high-risk-border); display: grid; gap: var(--noma-space-1); padding: var(--noma-space-3); }
.noma-high-risk-summary dt { color: var(--noma-commerce-high-risk-foreground); font-weight: var(--noma-font-weight-semibold); }
.noma-high-risk-summary dd { display: grid; gap: var(--noma-space-1); margin: 0; overflow-wrap: anywhere; }
.noma-high-risk-actions { display: flex; flex-wrap: wrap; gap: var(--noma-space-3); justify-content: flex-end; }
.noma-high-risk-actions .noma-button { min-height: var(--noma-commerce-high-risk-action-target); }

@media (max-width: 30rem) {
  .noma-money-breakdown-row { gap: var(--noma-space-2); }
  .noma-commerce-status-metadata, .noma-timeline-metadata { align-items: start; flex-direction: column; }
  .noma-evidence-card-header { align-items: start; flex-direction: column; }
  .noma-evidence-metadata div { grid-template-columns: 1fr; }
  .noma-high-risk-actions { flex-direction: column-reverse; }
  .noma-high-risk-actions .noma-button { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .noma-status-chip, .noma-commerce-status, .noma-commerce-banner, .noma-timeline-item, .noma-evidence-card { transition-duration: 0ms; }
}

@media (forced-colors: active) {
  .noma-status-chip, .noma-commerce-status, .noma-commerce-banner, .noma-evidence-card, .noma-high-risk-summary > div { border-color: CanvasText; }
  .noma-timeline-marker { background: CanvasText; border-color: Canvas; }
  .noma-timeline-item:not(:last-child)::before { background: CanvasText; }
}`;
