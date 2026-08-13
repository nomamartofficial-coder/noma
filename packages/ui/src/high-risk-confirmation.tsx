'use client';

import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Form, TextArea } from './static-primitives.js';
import { Button, Dialog } from './interactive-primitives.js';

export interface HighRiskConfirmationProps {
  readonly trigger: ReactNode;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly objectLabel: string;
  readonly objectReference?: string;
  readonly consequence: string;
  readonly moneyEffect?: ReactNode;
  readonly custodyEffect?: ReactNode;
  readonly visibilityEffect?: ReactNode;
  readonly reversibility: string;
  readonly reasonRequired?: boolean;
  readonly reasonLabel?: string;
  readonly reasonDescription?: string;
  readonly approvalRequirement?: string;
  readonly assuranceRequirement?: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly pendingLabel: string;
  readonly confirmVariant?: 'primary' | 'danger';
  readonly isPending: boolean;
  readonly onConfirm: (reason: string | undefined) => void;
  readonly onCancel?: () => void;
}

const GENERIC_CONFIRM_LABEL = /^(?:ok|yes|confirm|continue)$/i;

function requireSpecificText(value: string, name: string): void {
  if (value.trim().length === 0) throw new TypeError(`${name} must be explicit`);
}

export function HighRiskConfirmation(props: HighRiskConfirmationProps) {
  requireSpecificText(props.title, 'title');
  requireSpecificText(props.objectLabel, 'objectLabel');
  requireSpecificText(props.consequence, 'consequence');
  requireSpecificText(props.reversibility, 'reversibility');
  requireSpecificText(props.confirmLabel, 'confirmLabel');
  requireSpecificText(props.cancelLabel, 'cancelLabel');
  requireSpecificText(props.pendingLabel, 'pendingLabel');
  if (GENERIC_CONFIRM_LABEL.test(props.confirmLabel.trim())) {
    throw new TypeError('confirmLabel must name the material action');
  }

  const formId = `noma-high-risk-${useId()}`;
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();

  function requestClose(): void {
    if (props.isPending) return;
    props.onCancel?.();
    props.onOpenChange(false);
  }

  function handleOpenChange(open: boolean): void {
    if (!open) {
      requestClose();
      return;
    }
    props.onOpenChange(true);
  }

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (props.isPending) return;
    if (props.reasonRequired && reason.trim().length === 0) {
      setReasonError('Enter a reason before requesting this action.');
      return;
    }
    setReasonError(undefined);
    props.onConfirm(props.reasonRequired ? reason : undefined);
  }

  const effects = [
    props.moneyEffect && ['Money effect', props.moneyEffect],
    props.custodyEffect && ['Custody effect', props.custodyEffect],
    props.visibilityEffect && ['Visibility or access effect', props.visibilityEffect],
  ].filter(Boolean) as Array<[string, ReactNode]>;

  return (
    <Dialog
      closeLabel="Close confirmation"
      description={props.consequence}
      disablePointerDismissal
      footer={(
        <div className="noma-high-risk-actions">
          <Button disabled={props.isPending} onClick={requestClose} ref={cancelRef} variant="secondary">{props.cancelLabel}</Button>
          <Button form={formId} pending={props.isPending} pendingLabel={props.pendingLabel} type="submit" variant={props.confirmVariant ?? 'danger'}>{props.confirmLabel}</Button>
        </div>
      )}
      initialFocusRef={cancelRef}
      onOpenChange={handleOpenChange}
      open={props.open}
      title={props.title}
      trigger={props.trigger}
    >
      <Form id={formId} onSubmit={submit}>
        <dl className="noma-high-risk-summary">
          <div><dt>Object</dt><dd>{props.objectLabel}{props.objectReference && <span>Reference: {props.objectReference}</span>}</dd></div>
          {effects.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          <div><dt>Reversibility</dt><dd>{props.reversibility}</dd></div>
          {props.approvalRequirement && <div><dt>Approval requirement</dt><dd>{props.approvalRequirement}</dd></div>}
          {props.assuranceRequirement && <div><dt>Assurance requirement</dt><dd>{props.assuranceRequirement}</dd></div>}
        </dl>
        {props.reasonRequired && (
          <TextArea
            description={props.reasonDescription ?? 'This reason is recorded by the owning workflow.'}
            error={reasonError}
            label={props.reasonLabel ?? 'Reason'}
            onChange={(event) => setReason(event.currentTarget.value)}
            onInvalid={(event) => {
              event.preventDefault();
              setReasonError('Enter a reason before requesting this action.');
            }}
            required
            value={reason}
          />
        )}
      </Form>
    </Dialog>
  );
}
