'use client';

import { forwardRef, useId } from 'react';
import type { MouseEvent } from 'react';
import type { FormErrorSummaryProps } from './static-primitives.js';

export const FormErrorSummary = forwardRef<HTMLDivElement, FormErrorSummaryProps>(function FormErrorSummary(
  { className, errors, title = 'Please correct the following', ...props },
  ref,
) {
  const titleId = `noma-form-error-summary-${useId()}`;
  if (errors.length === 0) return null;

  function focusField(event: MouseEvent<HTMLAnchorElement>, fieldId: string) {
    const field = document.getElementById(fieldId);
    if (!(field instanceof HTMLElement)) return;
    event.preventDefault();
    field.focus();
    field.scrollIntoView({ block: 'center', behavior: 'auto' });
  }

  return (
    <div
      {...props}
      aria-labelledby={titleId}
      className={['noma-form-error-summary', className].filter(Boolean).join(' ')}
      ref={ref}
      role="alert"
      tabIndex={-1}
    >
      <h2 id={titleId}>{title}</h2>
      <p>{errors.length} {errors.length === 1 ? 'error' : 'errors'} prevented submission.</p>
      <ul>
        {errors.map((error) => (
          <li key={`${error.fieldId}:${error.message}`}>
            <a href={`#${error.fieldId}`} onClick={(event) => focusField(event, error.fieldId)}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
});
