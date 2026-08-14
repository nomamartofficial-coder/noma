import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import {
  Button,
  Checkbox,
  Dialog,
  Drawer,
  Form,
  FormErrorSummary,
  IconButton,
  Link,
  Menu,
  Pagination,
  PasswordField,
  RadioGroup,
  Select,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  TextArea,
  TextField,
  ToastProvider,
  useToast,
} from '../../packages/ui/dist/index.js';
import { expectNoAxeViolations } from './axe-helper.js';

describe('native and form primitives', () => {
  test('preserves action, navigation, label, description, error, and native form semantics', async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const summaryRef = createRef<HTMLDivElement>();
    const { container } = render(
      <Form onSubmit={submit}>
        <FormErrorSummary errors={[{ fieldId: 'email', message: 'Enter a valid email address' }]} ref={summaryRef} />
        <TextField description="Use your school address" error="Email is invalid" id="email" label="Email" name="email" required type="email" />
        <PasswordField id="password" label="Password" name="password" />
        <TextArea id="notes" label="Notes" name="notes" readOnly value="Visible but not editable" />
        <Button type="submit">Continue</Button>
        <Link href="/help">Get help</Link>
      </Form>,
    );
    const email = screen.getByRole('textbox', { name: /email/i });
    expect(email).toHaveAccessibleDescription('Use your school address Email is invalid');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    await user.type(screen.getByLabelText('Password'), 'paste-friendly');
    expect(screen.getByLabelText('Password')).toHaveValue('paste-friendly');
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveAttribute('readonly');
    expect(screen.getByRole('link', { name: 'Get help' })).toHaveAttribute('href', '/help');
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveAttribute('type', 'submit');
    await user.click(screen.getByRole('link', { name: 'Enter a valid email address' }));
    expect(email).toHaveFocus();
    summaryRef.current?.focus();
    expect(summaryRef.current).toHaveFocus();
    await expectNoAxeViolations(container);
  });

  test('table and pagination use native reading and navigation semantics', async () => {
    const { container } = render(
      <>
        <Table density="compact">
          <TableCaption>People</TableCaption>
          <TableHead><TableRow><TableHeaderCell scope="col">Name</TableHeaderCell></TableRow></TableHead>
          <TableBody><TableRow><TableCell>Ada</TableCell></TableRow></TableBody>
        </Table>
        <Pagination currentPage={2} getPageHref={(page) => `/people?page=${page}`} totalPages={3} />
      </>,
    );
    expect(screen.getByRole('table', { name: 'People' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'People' })).toHaveAttribute('data-density', 'compact');
    expect(screen.getByRole('link', { name: 'Page 2, current page' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Go to page 3' })).toHaveAttribute('href', '/people?page=3');
    expect(screen.getByRole('link', { name: 'Go to previous page' })).toHaveAttribute('href', '/people?page=1');
    expect(screen.getByRole('link', { name: 'Go to next page' })).toHaveAttribute('href', '/people?page=3');
    await expectNoAxeViolations(container);
  });

  test('rejects obvious executable link schemes without inventing URL rewriting', () => {
    expect(() => render(<Link href="javascript:alert(1)">Unsafe</Link>)).toThrow('Link does not accept executable URL schemes');
  });
});

describe('action and choice primitives', () => {
  test('button defaults safely and pending state prevents duplicate activation while preserving focus', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    const { rerender } = render(<Button onClick={action}>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'button');
    button.focus();
    rerender(<Button onClick={action} pending pendingLabel="Saving">Save</Button>);
    expect(screen.getByRole('button', { name: 'Saving' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Saving' }));
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Saving' })).toHaveAttribute('aria-busy', 'true');
  });

  test('icon button has a required name and choices support keyboard changes', async () => {
    const user = userEvent.setup();
    function Choices() {
      const [checked, setChecked] = useState(false);
      const [radio, setRadio] = useState('pickup');
      return <>
        <IconButton aria-label="Close panel">×</IconButton>
        <Checkbox checked={checked} label="Remember choice" onCheckedChange={setChecked} />
        <RadioGroup label="Delivery" name="delivery" onValueChange={setRadio} options={[{ label: 'Pickup', value: 'pickup' }, { label: 'Drop-off', value: 'dropoff' }]} value={radio} />
      </>;
    }
    const { container } = render(<Choices />);
    expect(screen.getByRole('button', { name: 'Close panel' })).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', { name: 'Remember choice' });
    checkbox.focus();
    await user.keyboard(' ');
    expect(checkbox).toBeChecked();
    const pickup = screen.getByRole('radio', { name: 'Pickup' });
    pickup.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Drop-off' })).toBeChecked();
    await user.keyboard('{ArrowLeft}');
    expect(pickup).toBeChecked();
    await expectNoAxeViolations(container);
  });
});

describe('composite keyboard primitives', () => {
  test('select, tabs, and menu expose bounded keyboard interaction', async () => {
    const user = userEvent.setup();
    const menuAction = vi.fn();
    const { container } = render(<>
      <Select label="Campus" name="campus" options={[{ label: 'Canaanland', value: 'canaanland' }, { label: 'Disabled', value: 'disabled', disabled: true }]} />
      <Tabs items={[{ label: 'Overview', panel: 'Overview panel', value: 'overview' }, { label: 'History', panel: 'History panel', value: 'history' }]} label="Record sections" />
      <Menu items={[{ id: 'copy', label: 'Copy', onSelect: menuAction }, { href: '/details', id: 'details', label: 'Details' }]} label="More actions" />
    </>);
    const select = screen.getByRole('combobox', { name: 'Campus' });
    await user.click(select);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(select).toHaveTextContent('Canaanland');
    const overview = screen.getByRole('tab', { name: 'Overview' });
    overview.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Home}');
    expect(overview).toHaveAttribute('aria-selected', 'true');
    const menuTrigger = screen.getByRole('button', { name: /more actions/i });
    await user.click(menuTrigger);
    await screen.findByRole('menuitem', { name: 'Copy' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Copy' })).not.toBeInTheDocument());
    await waitFor(() => expect(menuTrigger).toHaveFocus());
    await user.click(menuTrigger);
    const copyItem = await screen.findByRole('menuitem', { name: 'Copy' });
    await user.keyboard('{ArrowDown}{Home}');
    await waitFor(() => expect(copyItem).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(menuAction).toHaveBeenCalledOnce();
    await expectNoAxeViolations(container);
  });

  test('dialog and drawer trap modal work and restore trigger focus on Escape', async () => {
    const user = userEvent.setup();
    const { container } = render(<>
      <Dialog description="Review details" title="Confirm action" trigger="Open dialog"><Button>Confirm</Button></Dialog>
      <Drawer title="Filters" trigger="Open drawer"><TextField label="Search" /></Drawer>
    </>);
    const dialogTrigger = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(dialogTrigger);
    expect(screen.getByRole('dialog', { name: 'Confirm action' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(dialogTrigger).toHaveFocus();
    const drawerTrigger = screen.getByRole('button', { name: 'Open drawer' });
    await user.click(drawerTrigger);
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
    await user.keyboard('{Escape}');
    expect(drawerTrigger).toHaveFocus();
  });
});

function ToastProbe() {
  const toast = useToast();
  return <Button onClick={() => toast.show({ action: { label: 'Undo', onSelect: () => undefined }, title: 'Saved', tone: 'success' })}>Show notification</Button>;
}

test('toast preserves task focus, provides polite announcement, action, and close controls', async () => {
  const user = userEvent.setup();
  const { container } = render(<ToastProvider><ToastProbe /></ToastProvider>);
  const trigger = screen.getByRole('button', { name: 'Show notification' });
  trigger.focus();
  await user.keyboard('{Enter}');
  expect(trigger).toHaveFocus();
  expect(await screen.findByText('Saved')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  await expectNoAxeViolations(container);
  await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
});
