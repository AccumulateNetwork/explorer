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

  const v = Number(amount) / 10 ** issuer.precision;
  return <Amount amount={v} {...rest} label={issuer.symbol} />;
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

export function CreditAmountFromACME({
  amount,
  oracle,
  ...rest
}: {
  amount: number | bigint;
  oracle: number;
} & Omit<Parameters<typeof Amount>[0], 'label' | 'amount'>) {
  amount = (BigInt(amount) * BigInt(oracle)) / 10n ** 10n;
  return <CreditAmount amount={amount} {...rest} />;
}

export function OracleValue({
  value,
  ...rest
}: { value: number } & Omit<Parameters<typeof Amount>[0], 'label' | 'amount'>) {
  value /= 10 ** 4;
  return <Amount amount={value} label="credits/ACME" {...rest} />;
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
  amount: number;
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
  let s = amount.toLocaleString('en-US', {
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
      return tx.body.to;

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
        ...tx.body.to,
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
      const credits =
        (tx.body.amount * BigInt(tx.body.oracle)) / BigInt(10 ** 8);
      return [
        new CreditRecipient({
          url: tx.body.recipient,
          amount: Number(credits),
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
  return to.filter(predicate).reduce((v, x) => v + BigInt(x.amount), 0n);
}
