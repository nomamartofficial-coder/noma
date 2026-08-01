import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';

function HarnessProbe(): React.JSX.Element {
  const [active, setActive] = useState(false);
  return (
    <section aria-label="Testing Library harness">
      <button type="button" onClick={() => setActive(true)}>Activate</button>
      <output aria-live="polite">{active ? 'active' : 'inactive'}</output>
    </section>
  );
}

test('component project provides jsdom, role queries, matchers, cleanup, and user events', async () => {
  const user = userEvent.setup();
  render(<HarnessProbe />);
  expect(screen.getByRole('status')).toHaveTextContent('inactive');
  await user.click(screen.getByRole('button', { name: 'Activate' }));
  expect(screen.getByRole('status')).toHaveTextContent('active');
});
