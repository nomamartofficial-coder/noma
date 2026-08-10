'use client';

import { Button as BaseButton } from '@base-ui/react/button';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { Toast as BaseToast } from '@base-ui/react/toast';
import type { ButtonHTMLAttributes, ReactNode, RefObject } from 'react';
import { createContext, forwardRef, useContext, useId, useMemo } from 'react';

function classes(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ');
}

function describedBy(descriptionId: string, errorId: string, hasDescription: boolean, hasError: boolean): string | undefined {
  const ids = [hasDescription && descriptionId, hasError && errorId].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  readonly variant?: ButtonVariant;
  readonly size?: 'default' | 'action';
  readonly disabled?: boolean;
  readonly pending?: boolean;
  readonly pendingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className, disabled = false, pending = false, pendingLabel = 'Working', size = 'default', type = 'button', variant = 'primary', ...props },
  ref,
) {
  const blocked = disabled || pending;
  return (
    <BaseButton
      {...props}
      aria-busy={pending || undefined}
      className={classes('noma-button', className)}
      data-disabled={blocked || undefined}
      data-pending={pending || undefined}
      data-size={size}
      data-variant={variant}
      disabled={blocked}
      focusableWhenDisabled={pending}
      ref={ref}
      type={type}
    >
      <span>{pending ? pendingLabel : children}</span>
    </BaseButton>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'disabled'> {
  readonly 'aria-label': string;
  readonly disabled?: boolean;
  readonly pending?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, disabled = false, pending = false, type = 'button', ...props },
  ref,
) {
  const blocked = disabled || pending;
  return (
    <BaseButton
      {...props}
      aria-busy={pending || undefined}
      className={classes('noma-icon-button', className)}
      data-disabled={blocked || undefined}
      data-pending={pending || undefined}
      disabled={blocked}
      focusableWhenDisabled={pending}
      ref={ref}
      type={type}
    />
  );
});

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps {
  readonly label: ReactNode;
  readonly name?: string;
  readonly options: readonly SelectOption[];
  readonly value?: string | null;
  readonly defaultValue?: string | null;
  readonly onValueChange?: (value: string | null) => void;
  readonly placeholder?: string;
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly className?: string;
}

export function Select({
  className,
  defaultValue,
  description,
  disabled,
  error,
  label,
  name,
  onValueChange,
  options,
  placeholder = 'Select an option',
  readOnly,
  required,
  value,
}: SelectProps) {
  const generatedId = useId();
  const labelId = `noma-select-${generatedId}-label`;
  const descriptionId = `noma-select-${generatedId}-description`;
  const errorId = `noma-select-${generatedId}-error`;
  return (
    <div className={classes('noma-field', className)}>
      <span className="noma-field-label" id={labelId}>
        {label} {required && <span aria-hidden="true" className="noma-required-marker">*</span>}
      </span>
      {description && <p className="noma-field-description" id={descriptionId}>{description}</p>}
      <BaseSelect.Root
        defaultValue={defaultValue}
        disabled={disabled}
        items={Object.fromEntries(options.map((option) => [option.value, option.label]))}
        name={name}
        onValueChange={(nextValue) => onValueChange?.(nextValue)}
        readOnly={readOnly}
        required={required}
        value={value}
      >
        <BaseSelect.Trigger
          aria-describedby={describedBy(descriptionId, errorId, Boolean(description), Boolean(error))}
          aria-invalid={error ? true : undefined}
          aria-labelledby={labelId}
          className="noma-select-trigger"
        >
          <BaseSelect.Value placeholder={placeholder} />
          <BaseSelect.Icon aria-hidden="true">▾</BaseSelect.Icon>
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
          <BaseSelect.Positioner className="noma-select-positioner" sideOffset={4}>
            <BaseSelect.Popup className="noma-select-popup">
              <BaseSelect.List>
                {options.map((option) => (
                  <BaseSelect.Item className="noma-select-item" disabled={option.disabled} key={option.value} value={option.value}>
                    <BaseSelect.ItemIndicator className="noma-select-item-indicator">✓</BaseSelect.ItemIndicator>
                    <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                  </BaseSelect.Item>
                ))}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
      {error && <p className="noma-field-error" id={errorId}>{error}</p>}
    </div>
  );
}

export interface CheckboxProps {
  readonly label: ReactNode;
  readonly name?: string;
  readonly value?: string;
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  readonly onCheckedChange?: (checked: boolean) => void;
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly indeterminate?: boolean;
  readonly className?: string;
}

export function Checkbox({
  checked,
  className,
  defaultChecked,
  description,
  disabled,
  error,
  indeterminate,
  label,
  name,
  onCheckedChange,
  readOnly,
  required,
  value,
}: CheckboxProps) {
  const generatedId = useId();
  const id = `noma-checkbox-${generatedId}`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  return (
    <div className={classes('noma-field', className)}>
      <label className="noma-choice-row" htmlFor={id}>
        <BaseCheckbox.Root
          aria-describedby={describedBy(descriptionId, errorId, Boolean(description), Boolean(error))}
          aria-invalid={error ? true : undefined}
          checked={checked}
          className="noma-checkbox"
          defaultChecked={defaultChecked}
          disabled={disabled}
          id={id}
          indeterminate={indeterminate}
          name={name}
          onCheckedChange={(nextChecked) => onCheckedChange?.(nextChecked)}
          readOnly={readOnly}
          required={required}
          value={value}
        >
          <BaseCheckbox.Indicator className="noma-checkbox-indicator">{indeterminate ? '−' : '✓'}</BaseCheckbox.Indicator>
        </BaseCheckbox.Root>
        <span>{label} {required && <span aria-hidden="true" className="noma-required-marker">*</span>}</span>
      </label>
      {description && <p className="noma-field-description" id={descriptionId}>{description}</p>}
      {error && <p className="noma-field-error" id={errorId}>{error}</p>}
    </div>
  );
}

export interface RadioProps {
  readonly label: ReactNode;
  readonly value: string;
  readonly disabled?: boolean | undefined;
  readonly required?: boolean | undefined;
  readonly readOnly?: boolean | undefined;
}

export function Radio({ disabled, label, readOnly, required, value }: RadioProps) {
  const id = `noma-radio-${useId()}`;
  return (
    <label className="noma-choice-row" htmlFor={id}>
      <BaseRadio.Root className="noma-radio" disabled={disabled} id={id} readOnly={readOnly} required={required} value={value}>
        <BaseRadio.Indicator className="noma-radio-indicator" />
      </BaseRadio.Root>
      <span>{label}</span>
    </label>
  );
}

export interface RadioOption extends Omit<RadioProps, 'required' | 'readOnly'> {}
export interface RadioGroupProps {
  readonly label: ReactNode;
  readonly name: string;
  readonly options: readonly RadioOption[];
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly className?: string;
}

export function RadioGroup({
  className,
  defaultValue,
  description,
  disabled,
  error,
  label,
  name,
  onValueChange,
  options,
  readOnly,
  required,
  value,
}: RadioGroupProps) {
  const id = `noma-radio-group-${useId()}`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  return (
    <fieldset className={classes('noma-radio-group', className)}>
      <legend className="noma-field-legend">{label} {required && <span aria-hidden="true" className="noma-required-marker">*</span>}</legend>
      {description && <p className="noma-field-description" id={descriptionId}>{description}</p>}
      <BaseRadioGroup
        aria-describedby={describedBy(descriptionId, errorId, Boolean(description), Boolean(error))}
        aria-invalid={error ? true : undefined}
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        onValueChange={(nextValue) => onValueChange?.(nextValue)}
        readOnly={readOnly}
        required={required}
        value={value}
      >
        {options.map((option) => <Radio {...option} key={option.value} readOnly={readOnly} required={required} />)}
      </BaseRadioGroup>
      {error && <p className="noma-field-error" id={errorId}>{error}</p>}
    </fieldset>
  );
}

interface OverlayProps {
  readonly trigger: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly closeLabel?: string;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly disablePointerDismissal?: boolean;
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
}
export interface DialogProps extends OverlayProps {}
export interface DrawerProps extends OverlayProps { readonly side?: 'left' | 'right' | 'bottom' }

function Overlay({ closeLabel = 'Close', kind, onOpenChange, side, ...props }: OverlayProps & { readonly kind: 'dialog' | 'drawer'; readonly side?: DrawerProps['side'] }) {
  return (
    <BaseDialog.Root
      defaultOpen={props.defaultOpen}
      disablePointerDismissal={props.disablePointerDismissal}
      modal
      onOpenChange={(open) => onOpenChange?.(open)}
      open={props.open}
    >
      <BaseDialog.Trigger className="noma-button" data-size="default" data-variant="secondary" type="button">{props.trigger}</BaseDialog.Trigger>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="noma-dialog-backdrop" />
        <BaseDialog.Popup className="noma-dialog-popup" data-kind={kind} data-side={side} initialFocus={props.initialFocusRef}>
          <header className="noma-dialog-header">
            <BaseDialog.Title className="noma-dialog-title">{props.title}</BaseDialog.Title>
            {props.description && <BaseDialog.Description className="noma-dialog-description">{props.description}</BaseDialog.Description>}
          </header>
          <div className="noma-dialog-body">{props.children}</div>
          {props.footer && <footer className="noma-dialog-footer">{props.footer}</footer>}
          <BaseDialog.Close aria-label={closeLabel} className="noma-dialog-close" type="button">×</BaseDialog.Close>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

export function Dialog(props: DialogProps) { return <Overlay {...props} kind="dialog" />; }
export function Drawer({ side = 'right', ...props }: DrawerProps) { return <Overlay {...props} kind="drawer" side={side} />; }

export interface TabItem {
  readonly value: string;
  readonly label: ReactNode;
  readonly panel: ReactNode;
  readonly disabled?: boolean;
}
export interface TabsProps {
  readonly items: readonly TabItem[];
  readonly label: string;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly className?: string;
}

export function Tabs({ className, defaultValue, items, label, onValueChange, orientation = 'horizontal', value }: TabsProps) {
  return (
    <BaseTabs.Root className={className} defaultValue={defaultValue ?? items.find((item) => !item.disabled)?.value} onValueChange={(nextValue) => onValueChange?.(String(nextValue))} orientation={orientation} value={value}>
      <BaseTabs.List activateOnFocus aria-label={label} className="noma-tabs-list">
        {items.map((item) => <BaseTabs.Tab className="noma-tab" disabled={item.disabled} key={item.value} value={item.value}>{item.label}</BaseTabs.Tab>)}
      </BaseTabs.List>
      {items.map((item) => <BaseTabs.Panel className="noma-tab-panel" key={item.value} value={item.value}>{item.panel}</BaseTabs.Panel>)}
    </BaseTabs.Root>
  );
}

interface MenuActionItem {
  readonly id: string;
  readonly label: string;
  readonly onSelect: () => void;
  readonly href?: never;
  readonly disabled?: boolean;
  readonly tone?: 'default' | 'danger';
}
interface MenuLinkItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly onSelect?: never;
  readonly disabled?: boolean;
  readonly tone?: 'default' | 'danger';
}
export type MenuItem = MenuActionItem | MenuLinkItem;
export interface MenuProps {
  readonly label: ReactNode;
  readonly items: readonly MenuItem[];
  readonly disabled?: boolean;
  readonly className?: string;
}

export function Menu({ className, disabled, items, label }: MenuProps) {
  for (const item of items) {
    if (item.href && /^\s*(?:javascript|data):/i.test(item.href)) throw new Error('Menu links do not accept executable URL schemes');
  }
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger className={classes('noma-menu-trigger', className)} disabled={disabled} type="button">{label} <span aria-hidden="true">▾</span></BaseMenu.Trigger>
      <BaseMenu.Portal>
        <BaseMenu.Positioner className="noma-menu-positioner" sideOffset={4}>
          <BaseMenu.Popup className="noma-menu-popup">
            {items.map((item) => item.href ? (
              <BaseMenu.LinkItem
                className="noma-menu-item"
                data-tone={item.tone ?? 'default'}
                key={item.id}
                render={<a aria-disabled={item.disabled || undefined} href={item.disabled ? undefined : item.href} tabIndex={item.disabled ? -1 : undefined} />}
              >
                {item.label}
              </BaseMenu.LinkItem>
            ) : (
              <BaseMenu.Item className="noma-menu-item" data-tone={item.tone ?? 'default'} disabled={item.disabled} key={item.id} onClick={item.onSelect}>{item.label}</BaseMenu.Item>
            ))}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';
export type ToastPriority = 'low' | 'high';
export interface ToastInput {
  /** Brief operational feedback only; never use a toast as business finality. */
  readonly title: string;
  readonly description?: string;
  readonly tone?: ToastTone;
  readonly priority?: ToastPriority;
  readonly timeout?: number;
  readonly action?: { readonly label: string; readonly onSelect: () => void };
}
interface ToastApi { show(input: ToastInput): string; dismiss(id?: string): void }
interface ToastData { readonly action?: ToastInput['action'] }
const ToastContext = createContext<ToastApi | null>(null);

function ToastBridge({ children }: { readonly children: ReactNode }) {
  const manager = BaseToast.useToastManager<ToastData>();
  const api = useMemo<ToastApi>(() => ({
    dismiss: (id) => manager.close(id),
    show: (input) => manager.add({
      data: { action: input.action },
      description: input.description,
      priority: input.priority ?? 'low',
      timeout: input.timeout ?? (input.action || input.tone === 'warning' || input.tone === 'danger' ? 0 : 5500),
      title: input.title,
      type: input.tone ?? 'info',
    }),
  }), [manager]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <BaseToast.Viewport aria-label="Notifications" className="noma-toast-viewport">
        {manager.toasts.map((toast) => (
          <BaseToast.Root className="noma-toast" key={toast.id} toast={toast}>
            <BaseToast.Title className="noma-toast-title" />
            {toast.description && <BaseToast.Description className="noma-toast-description" />}
            <div className="noma-toast-controls">
              {toast.data?.action && <BaseToast.Action className="noma-toast-action" onClick={toast.data.action.onSelect} type="button">{toast.data.action.label}</BaseToast.Action>}
              <button aria-label="Dismiss notification" className="noma-toast-close" onClick={() => manager.close(toast.id)} type="button">Dismiss</button>
            </div>
          </BaseToast.Root>
        ))}
      </BaseToast.Viewport>
    </ToastContext.Provider>
  );
}

export function ToastProvider({ children, limit = 3 }: { readonly children: ReactNode; readonly limit?: number }) {
  return <BaseToast.Provider limit={limit} timeout={5500}><ToastBridge>{children}</ToastBridge></BaseToast.Provider>;
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used within ToastProvider');
  return value;
}
