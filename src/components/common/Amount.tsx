import { URL } from 'accumulate.js';
import {
  CreditRecipient,
  TokenIssuer,
  TokenRecipient,
  Transaction,
  TransactionType,
} from 'accumulate.js/lib/core';
import { Spin, Typography } from 'antd';
import React from 'react';

const { Text } = Typography;

export function TokenAmount({
  amount,
  issuer,
  debit = false,
  digits = {},
}: {
  amount: number | bigint;
  issuer: TokenIssuer;
  debit?: boolean;
  digits?: Parameters<typeof Amount>[0]['digits'];
}) {
  if (!issuer) return <Spin />;
  // if (!('max' in digits)) digits.max = issuer.precision;

  const v = Number(amount) / 10 ** issuer.precision;
  return (
    <Amount amount={v} debit={debit} digits={digits} label={issuer.symbol} />
  );
}

export function CreditAmount({
  amount,
  debit = false,
  digits = {},
}: {
  amount: number | bigint;
  debit?: boolean;
  digits?: Parameters<typeof Amount>[0]['digits'];
}) {
  if (typeof amount === 'bigint') {
    amount = Number(amount);
  }
  return (
    <Amount
      amount={amount / 100}
      debit={debit}
      digits={digits}
      label={{
        singular: 'credit',
        plural: 'credits',
      }}
    />
  );
}

export function Amount({
  amount,
  label,
  debit = false,
  digits = {},
}: {
  amount: number;
  label?: string | { singular: string; plural: string };
  debit?: boolean;
  digits?: {
    group?: boolean;
    min?: number;
    max?: number;
  };
}) {
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
  const color = debit ? 'hsl(0, 75%, 50%)' : 'black';
  return <Text style={{ color }}>{s}</Text>;
}

function tokenAmount(amount, precision, symbol) {
  let symbolStr = symbol ? ' ' + symbol : '';

  if (precision === 0) {
    return amount.toString() + symbolStr;
  } else {
    return (
      (amount / 10 ** precision).toFixed(precision).replace(/\.?0+$/, '') +
      symbolStr
    );
  }
}

function tokenAmountToLocaleString(
  amount,
  precision,
  symbol,
  min = 2,
  max = 2,
) {
  let symbolStr = symbol ? ' ' + symbol : '';

  return (
    parseFloat((amount / 10 ** precision) as any).toLocaleString('en-US', {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    }) + symbolStr
  );
}

export { tokenAmount, tokenAmountToLocaleString };

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
          url: URL.parse('acc://ACME'),
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
          url: URL.parse('acc://ACME'),
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
