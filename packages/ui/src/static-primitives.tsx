import type {
  AnchorHTMLAttributes,
  FormHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  TextareaHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { forwardRef, useId } from 'react';

function classes(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ');
}

function describedBy(descriptionId: string, errorId: string, hasDescription: boolean, hasError: boolean, supplied?: string): string | undefined {
  const ids = [supplied, hasDescription && descriptionId, hasError && errorId].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  readonly href: string;
  readonly standalone?: boolean;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { className, href, standalone = false, ...props },
  ref,
) {
  if (/^\s*(?:javascript|data):/i.test(href)) throw new Error('Link does not accept executable URL schemes');
  return <a {...props} className={classes('noma-link', className)} data-standalone={standalone || undefined} href={href} ref={ref} />;
});

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  readonly label: ReactNode;
  readonly htmlFor: string;
  readonly description?: ReactNode;
  readonly descriptionId?: string;
  readonly error?: ReactNode;
  readonly errorId?: string;
  readonly required?: boolean | undefined;
}

export function Field({
  children,
  className,
  description,
  descriptionId,
  error,
  errorId,
  htmlFor,
  label,
  required,
  ...props
}: FieldProps) {
  return (
    <div {...props} className={classes('noma-field', className)}>
      <label className="noma-field-label" htmlFor={htmlFor}>
        {label} {required && <span aria-hidden="true" className="noma-required-marker">*</span>}
      </label>
      {description && <p className="noma-field-description" id={descriptionId}>{description}</p>}
      {children}
      {error && <p className="noma-field-error" id={errorId}>{error}</p>}
    </div>
  );
}

interface CommonFieldProps {
  readonly label: ReactNode;
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly fieldClassName?: string;
}

export interface TextFieldProps extends CommonFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  readonly type?: 'text' | 'email' | 'tel' | 'url' | 'search' | 'number';
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { 'aria-describedby': suppliedDescription, className, description, error, fieldClassName, id: suppliedId, label, required, type = 'text', ...props },
  ref,
) {
  const generatedId = useId();
  const id = suppliedId ?? `noma-field-${generatedId}`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  return (
    <Field className={fieldClassName} description={description} descriptionId={descriptionId} error={error} errorId={errorId} htmlFor={id} label={label} required={required}>
      <input
        {...props}
        aria-describedby={describedBy(descriptionId, errorId, Boolean(description), Boolean(error), suppliedDescription)}
        aria-invalid={error ? true : undefined}
        className={classes('noma-input', className)}
        id={id}
        ref={ref}
        required={required}
        type={type}
      />
    </Field>
  );
});

export interface PasswordFieldProps extends CommonFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { autoComplete = 'current-password', ...props },
  ref,
) {
  const { 'aria-describedby': suppliedDescription, className, description, error, fieldClassName, id: suppliedId, label, required, ...inputProps } = props;
  const generatedId = useId();
  const id = suppliedId ?? `noma-password-${generatedId}`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  return (
    <Field className={fieldClassName} description={description} descriptionId={descriptionId} error={error} errorId={errorId} htmlFor={id} label={label} required={required}>
      <input
        {...inputProps}
        aria-describedby={describedBy(descriptionId, errorId, Boolean(description), Boolean(error), suppliedDescription)}
        aria-invalid={error ? true : undefined}
        autoComplete={autoComplete}
        className={classes('noma-input', className)}
        id={id}
        ref={ref}
        required={required}
        type="password"
      />
    </Field>
  );
});

export interface TextAreaProps extends CommonFieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { 'aria-describedby': suppliedDescription, className, description, error, fieldClassName, id: suppliedId, label, required, ...props },
  ref,
) {
  const generatedId = useId();
  const id = suppliedId ?? `noma-textarea-${generatedId}`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  return (
    <Field className={fieldClassName} description={description} descriptionId={descriptionId} error={error} errorId={errorId} htmlFor={id} label={label} required={required}>
      <textarea
        {...props}
        aria-describedby={describedBy(descriptionId, errorId, Boolean(description), Boolean(error), suppliedDescription)}
        aria-invalid={error ? true : undefined}
        className={classes('noma-textarea', className)}
        id={id}
        ref={ref}
        required={required}
      />
    </Field>
  );
});

export function Form(props: FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props} />;
}

export interface FormError {
  readonly fieldId: string;
  readonly message: string;
}

export interface FormErrorSummaryProps extends HTMLAttributes<HTMLDivElement> {
  readonly errors: readonly FormError[];
  readonly title?: string;
}

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  readonly density?: 'comfortable' | 'compact';
}
export function Table({ className, density = 'comfortable', ...props }: TableProps) {
  return <div className="noma-table-scroll"><table {...props} className={classes('noma-table', className)} data-density={density} /></div>;
}
export function TableCaption(props: HTMLAttributes<HTMLTableCaptionElement>) { return <caption {...props} />; }
export function TableHead(props: HTMLAttributes<HTMLTableSectionElement>) { return <thead {...props} />; }
export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) { return <tbody {...props} />; }
export function TableRow(props: HTMLAttributes<HTMLTableRowElement>) { return <tr {...props} />; }
export function TableHeaderCell(props: ThHTMLAttributes<HTMLTableCellElement>) { return <th {...props} />; }
export function TableCell(props: TdHTMLAttributes<HTMLTableCellElement>) { return <td {...props} />; }

export interface PaginationProps extends HTMLAttributes<HTMLElement> {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly getPageHref: (page: number) => string;
  readonly label?: string;
}

export function Pagination({ className, currentPage, getPageHref, label = 'Pagination', totalPages, ...props }: PaginationProps) {
  if (!Number.isInteger(currentPage) || !Number.isInteger(totalPages) || currentPage < 1 || totalPages < 1 || currentPage > totalPages) {
    throw new Error('Pagination requires integer pages with 1 <= currentPage <= totalPages');
  }
  const visiblePages = totalPages <= 7
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter((page) => page >= 1 && page <= totalPages))].sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];
  for (const page of visiblePages) {
    const previous = items.at(-1);
    if (typeof previous === 'number' && page - previous > 1) items.push('ellipsis');
    items.push(page);
  }
  return (
    <nav {...props} aria-label={label} className={classes('noma-pagination', className)}>
      <ul className="noma-pagination-list">
        <li>{currentPage > 1 ? <a aria-label="Go to previous page" className="noma-pagination-link" href={getPageHref(currentPage - 1)}>Previous</a> : <span aria-disabled="true" className="noma-pagination-link">Previous</span>}</li>
        {items.map((item, index) => item === 'ellipsis'
          ? <li aria-hidden="true" className="noma-pagination-ellipsis" key={`ellipsis-${index}`}>…</li>
          : (
            <li key={item}>
              <a
                aria-current={item === currentPage ? 'page' : undefined}
                aria-label={item === currentPage ? `Page ${item}, current page` : `Go to page ${item}`}
                className="noma-pagination-link"
                href={getPageHref(item)}
              >{item}</a>
            </li>
          ))}
        <li>{currentPage < totalPages ? <a aria-label="Go to next page" className="noma-pagination-link" href={getPageHref(currentPage + 1)}>Next</a> : <span aria-disabled="true" className="noma-pagination-link">Next</span>}</li>
      </ul>
    </nav>
  );
}
