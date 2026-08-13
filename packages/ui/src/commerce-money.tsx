import type { HTMLAttributes, ReactNode } from 'react';

export type MinorUnitValue = bigint | string;
export type FractionDisplay = 'auto' | 'always';

const CANONICAL_MINOR_UNITS = /^(?:0|-[1-9][0-9]*|[1-9][0-9]*)$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;

function canonicalMinorUnits(value: MinorUnitValue): string {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'string' || !CANONICAL_MINOR_UNITS.test(value) || value === '-0') {
    throw new TypeError('amountMinor must be a bigint or canonical signed base-10 integer string');
  }
  return value;
}

function assertCurrency(currency: string): void {
  if (!CURRENCY_CODE.test(currency)) throw new TypeError('currency must be an uppercase three-letter identifier');
}

export function formatMoneyMinorUnits(
  amountMinor: MinorUnitValue,
  currency: string,
  locale = 'en-NG',
  fractionDisplay: FractionDisplay = 'auto',
): string {
  const canonical = canonicalMinorUnits(amountMinor);
  assertCurrency(currency);
  const currencyMetadata = new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions();
  const fractionDigits = currencyMetadata.maximumFractionDigits;
  const exactDecimal = fractionDigits === 0 ? canonical : `${canonical}e-${fractionDigits}`;
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDisplay === 'always' ? fractionDigits : 0,
    maximumFractionDigits: fractionDigits,
    notation: 'standard',
  });
  const formatExact = formatter.format as unknown as (value: string) => string;
  return formatExact(exactDecimal);
}

export interface MoneyProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  readonly amountMinor: MinorUnitValue;
  readonly currency: string;
  readonly locale?: string;
  readonly fractionDisplay?: FractionDisplay;
}

export function Money({ amountMinor, className, currency, fractionDisplay = 'auto', locale = 'en-NG', ...props }: MoneyProps) {
  const canonical = canonicalMinorUnits(amountMinor);
  const classes = ['noma-money', canonical.startsWith('-') ? 'noma-money-negative' : undefined, className].filter(Boolean).join(' ');
  return <span {...props} className={classes}>{formatMoneyMinorUnits(canonical, currency, locale, fractionDisplay)}</span>;
}

export interface MoneyBreakdownItem {
  readonly id: string;
  readonly label: string;
  readonly amountMinor: MinorUnitValue;
  readonly description?: ReactNode;
  readonly currency?: never;
}

export interface MoneyBreakdownTotal {
  readonly label: string;
  readonly amountMinor: MinorUnitValue;
  readonly currency?: never;
}

export interface MoneyBreakdownProps extends Omit<HTMLAttributes<HTMLDListElement>, 'children'> {
  readonly currency: string;
  readonly items: readonly MoneyBreakdownItem[];
  readonly total: MoneyBreakdownTotal;
  readonly locale?: string;
  readonly fractionDisplay?: FractionDisplay;
}

function rejectCurrencyOverride(value: MoneyBreakdownItem | MoneyBreakdownTotal): void {
  if (Object.prototype.hasOwnProperty.call(value, 'currency')) {
    throw new TypeError('MoneyBreakdown uses one outer currency; item and total currency overrides are forbidden');
  }
}

export function MoneyBreakdown({ className, currency, fractionDisplay = 'auto', items, locale = 'en-NG', total, ...props }: MoneyBreakdownProps) {
  assertCurrency(currency);
  items.forEach(rejectCurrencyOverride);
  rejectCurrencyOverride(total);
  return (
    <dl {...props} className={['noma-money-breakdown', className].filter(Boolean).join(' ')}>
      {items.map((item) => (
        <div className="noma-money-breakdown-row" key={item.id}>
          <dt>{item.label}{item.description && <span className="noma-money-breakdown-description">{item.description}</span>}</dt>
          <dd><Money amountMinor={item.amountMinor} currency={currency} fractionDisplay={fractionDisplay} locale={locale} /></dd>
        </div>
      ))}
      <div className="noma-money-breakdown-row noma-money-breakdown-total">
        <dt>{total.label}</dt>
        <dd><Money amountMinor={total.amountMinor} currency={currency} fractionDisplay={fractionDisplay} locale={locale} /></dd>
      </div>
    </dl>
  );
}
