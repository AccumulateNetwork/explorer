import { Spin, Typography } from 'antd';
import { TextProps } from 'antd/lib/typography/Text';
import React from 'react';

import {
  CreditRecipient,
  TokenIssuer,
  TokenRecipient,
  Transaction,
  TransactionType,
} from 'accumulate.js/lib/core';

import { ACME } from '../../utils/url';

const { Text } = Typography;

/**
 * Parses a decimal string into base units, exactly — the inverse of
 * {@link formatUnits}. Returns `undefined` for anything that is not a plain
 * non-negative decimal number, or that names more fractional digits than
 * `precision` allows, rather than silently rounding
 * (`Math.round(x * 10 ** precision)` turns 0.29 ACME into
 * 28999999.999999996 base units — see #91).
 */
export function parseUnits(
  input: string,
  precision: number,
): bigint | undefined {
  const m = /^(\d+)?(?:\.(\d+))?$/.exec(input?.trim());
  if (!m || (!m[1] && !m[2])) return undefined;
  const [, whole = '0', frac = ''] = m;
  if (frac.length > precision) return undefined;
  return BigInt(whole + frac.padEnd(precision, '0'));
}

/**
 * Formats base units as an exact decimal string — the inverse of
 * {@link parseUnits}. Never routes through `Number`, so it stays exact past
 * `Number.MAX_SAFE_INTEGER` (for ACME, base units above ~90M ACME) where
 * `Number(amount) / 10 ** precision` silently loses digits (#91).
 */
export function formatUnits(
  amount: bigint | number,
  precision: number,
): string {
  let n = typeof amount === 'bigint' ? amount : BigInt(Math.trunc(amount));
  const sign = n < 0n ? '-' : '';
  if (n < 0n) n = -n;
  const s = n.toString().padStart(precision + 1, '0');
  const whole = precision > 0 ? s.slice(0, -precision) : s;
  const frac = precision > 0 ? s.slice(-precision).replace(/0+$/, '') : '';
  return sign + whole + (frac ? '.' + frac : '');
}

export function TokenAmount({
  amount,
  issuer,
  ...rest
}: {
  amount: number | bigint;
  issuer: TokenIssuer | 'ACME';
} & Omit<Parameters<typeof Amount>[0], 'label' | 'amount'>) {
  if (!issuer) return <Spin />;

  if (issuer === 'ACME') {
    issuer = new TokenIssuer({
      precision: 8,
      symbol: 'ACME',
    });
  }

  if (!('digits' in rest)) rest.digits = {};
  if (!('max' in rest.digits)) rest.digits.max = issuer.precision;

  const s = formatUnits(amount, issuer.precision);
  return <Amount amount={s} {...rest} label={issuer.symbol} />;
}

export function CreditAmount({
  amount,
  ...rest
}: {
  amount: number | bigint;
} & Omit<Parameters<typeof Amount>[0], 'label' | 'amount'>) {
  if (typeof amount === 'bigint') {
    amount = Number(amount);
  }
  return (
    <Amount
      amount={amount / 100}
      label={{
        singular: 'credit',
        plural: 'credits',
      }}
      {...rest}
    />
  );
}

/**
 * Credits purchased (in credit balance units, precision 2) for an ACME spend.
 *
 * Mirrors the protocol executor (add_credits.go):
 *   credits = amount · oracle · CreditUnitsPerFiatUnit / (AcmeOraclePrecision · AcmePrecision)
 *           = amount · oracle · 1e4 / (1e4 · 1e8)
 *           = amount · oracle / 1e8
 * where `amount` is ACME balance units (1e8/ACME) and `oracle` is the price in
 * 100·USD per ACME (1e4 precision). Truncating division, like the executor.
 */
export function creditsFromAcme(amount: number | bigint, oracle: number) {
  return (BigInt(amount) * BigInt(oracle)) / 10n ** 8n;
}

/**
 * The inverse of {@link creditsFromAcme}: ACME base units needed to buy
 * `credits` whole credits at the given oracle price. Rounds up (ceiling),
 * so the requested credit count is still met after the executor's own
 * truncating division — never one credit short.
 *
 * Returns `undefined` for a `credits` or `oracle` that can't yield a
 * sensible answer, rather than the `NaN`/non-integer values that
 * `((credits * 100) / oracle) * 10 ** 8` (float throughout) used to produce
 * for almost any oracle price that didn't divide evenly — which the SDK's
 * `BigInt(amount)` then rejected (#91).
 */
export function acmeUnitsForCredits(
  credits: number,
  oracle: number,
): bigint | undefined {
  if (!oracle || !Number.isFinite(oracle) || oracle <= 0) return undefined;
  const rawCredits = parseUnits(String(credits ?? ''), 2);
  if (rawCredits === undefined || rawCredits <= 0n) return undefined;
  const oracleUnits = BigInt(oracle);
  return (rawCredits * 10n ** 8n + oracleUnits - 1n) / oracleUnits;
}

export function CreditAmountFromACME({
  amount,
  oracle,
  ...rest
}: {
  amount: number | bigint;
  oracle: number;
} & Omit<Parameters<typeof Amount>[0], 'label' | 'amount'>) {
  return <CreditAmount amount={creditsFromAcme(amount, oracle)} {...rest} />;
}

export function OracleValue({
  value,
  ...rest
}: { value: number } & Omit<Parameters<typeof Amount>[0], 'label' | 'amount'>) {
  value /= 10 ** 4;
  return <Amount amount={value} label="credits/ACME" {...rest} />;
}

// Inserts thousands separators into the whole-number part of an exact
// decimal string, without going through Number (see `formatExact`, #91).
function groupThousands(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// The string-`amount` counterpart of `amount.toLocaleString(...)` below,
// for a value that is already an exact decimal string (from `formatUnits`)
// and must stay exact — routing it through Number would reintroduce the
// precision loss `formatUnits` exists to avoid (#91).
function formatExact(
  amount: string,
  { group, min, max }: { group: boolean; min: number; max?: number },
) {
  const neg = amount.startsWith('-');
  let [whole, frac = ''] = (neg ? amount.slice(1) : amount).split('.');
  if (max !== undefined && frac.length > max) {
    frac = frac.slice(0, max);
  }
  frac = frac.padEnd(min, '0');
  if (group) {
    whole = groupThousands(whole);
  }
  return (neg ? '-' : '') + whole + (frac ? '.' + frac : '');
}

export function Amount({
  amount,
  label,
  className,
  debit = false,
  bare = false,
  type,
  style,
  digits = {},
}: {
  amount: number | string;
  label?: string | { singular: string; plural: string };
  className?: string;
  debit?: boolean;
  bare?: boolean;
  type?: TextProps['type'];
  style?: React.CSSProperties;
  digits?: {
    group?: boolean;
    min?: number;
    max?: number;
  };
}) {
  if (typeof amount === 'number' && isNaN(amount)) {
    amount = 0;
  }
  const { group = false, min = 0, max } = digits;
  let s =
    typeof amount === 'string'
      ? formatExact(amount, { group, min, max })
      : amount.toLocaleString('en-US', {
          useGrouping: group,
          minimumFractionDigits: min,
          maximumFractionDigits: max,
        });
  if (label) {
    if (typeof label === 'string') {
      s += ' ' + label;
    } else if (amount == 1) {
      s += ' ' + label.singular;
    } else {
      s += ' ' + label.plural;
    }
  }
  if (debit) {
    s = '(' + s + ')';
  }
  if (bare) {
    return s;
  }
  const color = debit ? 'hsl(0, 75%, 50%)' : null;
  return (
    <Text className={className} type={type} style={{ color, ...style }}>
      {s}
    </Text>
  );
}

export function recipientsOfTx(
  tx: Transaction,
): TokenRecipient[] | CreditRecipient[] | null {
  switch (tx.body.type) {
    case TransactionType.SendTokens:
    case TransactionType.TransferCredits:
      return tx.body.to || [];

    case TransactionType.IssueTokens: {
      return [
        ...(tx.body.recipient
          ? [
              new TokenRecipient({
                url: tx.body.recipient,
                amount: tx.body.amount,
              }),
            ]
          : []),
        ...(tx.body.to || []),
      ];
    }

    case TransactionType.BurnTokens:
    case TransactionType.SyntheticBurnTokens:
      return [
        new TokenRecipient({
          url: ACME,
          amount: tx.body.amount,
        }),
      ];

    case TransactionType.AddCredits:
      return [
        new CreditRecipient({
          url: tx.body.recipient,
          amount: Number(creditsFromAcme(tx.body.amount, tx.body.oracle)),
        }),
      ];

    case TransactionType.SyntheticDepositTokens:
      return [
        new TokenRecipient({
          url: tx.header.principal,
          amount: tx.body.amount,
        }),
      ];

    case TransactionType.SyntheticDepositCredits:
      return [
        new CreditRecipient({
          url: tx.header.principal,
          amount: tx.body.amount,
        }),
      ];

    case TransactionType.BlockValidatorAnchor:
      if (!tx.body.acmeBurnt) {
        return [];
      }
      return [
        new TokenRecipient({
          url: ACME,
          amount: tx.body.acmeBurnt,
        }),
      ];

    default:
      return null;
  }
}

export function totalAmount(
  to: readonly (CreditRecipient | TokenRecipient)[],
  predicate = (_: CreditRecipient | TokenRecipient) => true,
) {
  return to.filter(predicate).reduce((v, x) => {
    const amt = x.amount ?? 0;
    return v + (typeof amt === 'bigint' ? amt : BigInt(amt));
  }, 0n);
}
