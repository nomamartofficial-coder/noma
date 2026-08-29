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
} from '@noma/ui';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

function PrimitiveCanvas({ children }: Readonly<{ children?: React.ReactNode }>) {
  return <section className="noma-story-section"><h1>Accessible Noma primitives</h1>{children}</section>;
}

function ToastDemo() {
  const toast = useToast();
  return <Button onClick={() => toast.show({ title: 'Draft retained', description: 'No business completion was claimed.', tone: 'warning' })}>Show feedback</Button>;
}

const meta = {
  id: 'primitives-noma',
  title: 'Primitives/Accessible component set',
  component: PrimitiveCanvas,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PrimitiveCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ButtonMatrix: Story = {
  render: () => <PrimitiveCanvas><div className="noma-story-grid"><Button>Primary action</Button><Button variant="secondary">Secondary action</Button><Button variant="danger">Danger action</Button><Button variant="success">Success action</Button><Button disabled>Unavailable action</Button><Button pending pendingLabel="Saving draft">Save draft</Button><IconButton aria-label="Open notifications">◎</IconButton></div></PrimitiveCanvas>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Primary action' })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Saving draft' })).toHaveAttribute('aria-busy', 'true');
  },
};

export const ButtonForcedColoursFocus: Story = {
  render: () => <PrimitiveCanvas><Button>Review focused action</Button></PrimitiveCanvas>,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Review focused action' });
    button.focus();
    await expect(button).toHaveFocus();
  },
};

export const FormErrors: Story = {
  render: () => <PrimitiveCanvas><Form className="noma-story-stack"><FormErrorSummary errors={[{ fieldId: 'story-email', message: 'Enter a Covenant email address.' }]} /><TextField error="Enter a Covenant email address." id="story-email" label="Email address" required /><TextArea description="Describe the correction without including credentials." label="Correction note" /></Form></PrimitiveCanvas>,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Email address *')).toHaveAttribute('aria-invalid', 'true');
  },
};

export const ChoiceControls: Story = {
  render: () => <PrimitiveCanvas><div className="noma-story-stack"><Select label="Collection point" options={[{ value: 'gate', label: 'Main gate' }, { value: 'hall', label: 'Residence hall', disabled: true }]} placeholder="Choose a point" /><Checkbox label="Keep this draft" description="This does not submit the request." /><Checkbox disabled label="Unavailable option" /><RadioGroup label="Contact preference" name="contact-preference" options={[{ value: 'message', label: 'Noma message' }, { value: 'phone', label: 'Phone call' }]} /></div></PrimitiveCanvas>,
};

export const DialogOpen: Story = {
  render: () => <PrimitiveCanvas><Dialog defaultOpen description="Review the supplied details before leaving." footer={<Button variant="secondary">Return</Button>} title="Review draft" trigger="Open review">No business command is performed by this presentation.</Dialog></PrimitiveCanvas>,
  play: async () => { await expect(within(document.body).getByRole('dialog')).toBeVisible(); },
};

export const DrawerOpen: Story = {
  render: () => <PrimitiveCanvas><Drawer defaultOpen description="Navigation remains supplied by the owning surface." side="right" title="Account menu" trigger="Open account menu"><Link href="/account">Account overview</Link></Drawer></PrimitiveCanvas>,
};

export const MenuOpen: Story = {
  render: () => <PrimitiveCanvas><Menu items={[{ id: 'shop', label: 'Shop on Noma', href: '/' }, { id: 'account', label: 'My account', href: '/account' }]} label="Noma surfaces" /></PrimitiveCanvas>,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Noma surfaces/ }));
    await waitFor(async () => expect(within(document.body).getByRole('menuitem', { name: 'Shop on Noma' })).toBeVisible());
  },
};

export const NavigationControls: Story = {
  render: () => <PrimitiveCanvas><div className="noma-story-stack"><Tabs items={[{ value: 'summary', label: 'Summary', panel: 'Supplied summary presentation.' }, { value: 'history', label: 'History', panel: 'Immutable history presentation.' }]} label="Order presentation" /><Pagination currentPage={2} getPageHref={(page) => `/search?page=${page}`} totalPages={5} /></div></PrimitiveCanvas>,
};

export const ResponsiveTable: Story = {
  render: () => <PrimitiveCanvas><Table density="compact"><TableCaption>Synthetic queue presentation</TableCaption><TableHead><TableRow><TableHeaderCell scope="col">Reference</TableHeaderCell><TableHeaderCell scope="col">State</TableHeaderCell><TableHeaderCell scope="col">Owner</TableHeaderCell></TableRow></TableHead><TableBody><TableRow><TableHeaderCell scope="row">SYN-QUEUE-001</TableHeaderCell><TableCell>Needs review</TableCell><TableCell>Operations</TableCell></TableRow></TableBody></Table></PrimitiveCanvas>,
};

export const ToastFeedback: Story = {
  render: () => <PrimitiveCanvas><ToastProvider><ToastDemo /></ToastProvider></PrimitiveCanvas>,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Show feedback' }));
    await waitFor(async () => expect(within(document.body).getByText('Draft retained')).toBeVisible());
  },
};
