import { densityModes, statusTones } from '@noma/ui';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

function FoundationCanvas({ mode }: Readonly<{ mode: 'colour' | 'type' }>) {
  if (mode === 'colour') {
    return (
      <section className="noma-story-section">
        <header><p>Noma design foundation</p><h1>Semantic colour roles</h1><p className="noma-story-copy">Colours communicate hierarchy and status only when paired with readable text.</p></header>
        <div className="noma-story-grid">
          {['primary', 'success', 'warning', 'danger'].map((tone) => <article className="noma-story-card" key={tone}><div className="noma-story-swatch" data-tone={tone} /><h2>{tone}</h2><p>Token-backed presentation</p></article>)}
        </div>
        <p>Supported status tones: {statusTones.join(', ')}</p>
      </section>
    );
  }
  return (
    <section className="noma-story-section">
      <header><p>Noma design foundation</p><h1>Typography, spacing, and density</h1></header>
      <div className="noma-story-card noma-story-stack">
        <h2>Marketplace heading</h2>
        <p className="noma-story-copy">Readable body copy uses semantic typography and spacing tokens across consumer and operational surfaces.</p>
        <p><strong>Exact money and references use tabular numeric styles where supplied by a component.</strong></p>
      </div>
      <div className="noma-story-grid">{densityModes.map((mode) => <div className="noma-story-card" key={mode}><strong>{mode}</strong><p>Explicit density contract</p></div>)}</div>
    </section>
  );
}

const meta = {
  id: 'foundations-noma',
  title: 'Foundations/Noma foundations',
  component: FoundationCanvas,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof FoundationCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colour: Story = { args: { mode: 'colour' } };
export const TypographySpacing: Story = { args: { mode: 'type' } };
