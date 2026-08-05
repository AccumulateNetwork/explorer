import { describe, expect, it } from 'vitest';

import {
  CreditRecipient,
  TokenRecipient,
  Transaction,
} from 'accumulate.js/lib/core';

import { creditsFromAcme, recipientsOfTx, totalAmount } from './Amount';

// This is the code area that produced HOTFIX-BIGINT-2026-02-22: pure BigInt
// arithmetic across nine transaction types, previously untested (#66).

const alice = 'acc://alice.acme/tokens';
const bob = 'acc://bob.acme/tokens';

function txn(body: Record<string, unknown>, principal = alice) {
  return new Transaction({ header: { principal }, body } as never);
}

describe('creditsFromAcme', () => {
  // Ground truth is the protocol executor (add_credits.go):
  //   credits = amount·oracle·CreditUnitsPerFiatUnit / (AcmeOraclePrecision·AcmePrecision)
  // With the 2026-08 mainnet oracle of 5000 (= $0.50/ACME), 1 ACME buys
  // $0.50 · 100 credits/$ = 50 credits = 5000 credit balance units.
  it('matches the executor for 1 ACME at oracle 5000', () => {
    expect(creditsFromAcme(100_000_000n, 5000)).toBe(5000n);
  });

  it('is exact beyond Number precision', () => {
    // 10 billion ACME — amount·oracle overflows 2^53 as a float
    expect(creditsFromAcme(10_000_000_000n * 100_000_000n, 5000)).toBe(
      50_000_000_000_000n,
    );
  });

  it('truncates like the executor, never rounds up', () => {
    // 1 ACME balance unit at oracle 5000 → 0.00005 credit units → 0
    expect(creditsFromAcme(1n, 5000)).toBe(0n);
    expect(creditsFromAcme(19_999n, 5000)).toBe(0n);
    expect(creditsFromAcme(20_000n, 5000)).toBe(1n);
  });

  it('accepts number amounts', () => {
    expect(creditsFromAcme(100_000_000, 5000)).toBe(5000n);
  });
});

describe('recipientsOfTx', () => {
  it('returns the recipient list of a SendTokens', () => {
    const to = recipientsOfTx(
      txn({
        type: 'sendTokens',
        to: [
          { url: bob, amount: 500n },
          { url: alice, amount: 1n },
        ],
      }),
    );
    expect(to).toHaveLength(2);
    expect(to[0]).toBeInstanceOf(TokenRecipient);
    expect(to[0].url.toString()).toBe(bob);
    expect(to[0].amount).toBe(500n);
  });

  it('returns [] for a SendTokens with no recipients', () => {
    expect(recipientsOfTx(txn({ type: 'sendTokens' }))).toEqual([]);
  });

  it('returns the recipient list of a TransferCredits', () => {
    const to = recipientsOfTx(
      txn({ type: 'transferCredits', to: [{ url: bob, amount: 300 }] }),
    );
    expect(to).toHaveLength(1);
    expect(to[0]).toBeInstanceOf(CreditRecipient);
    expect(to[0].amount).toBe(300);
  });

  it('combines recipient and to for an IssueTokens', () => {
    const to = recipientsOfTx(
      txn({
        type: 'issueTokens',
        recipient: bob,
        amount: 700n,
        to: [{ url: alice, amount: 40n }],
      }),
    );
    expect(to).toHaveLength(2);
    expect(to[0].url.toString()).toBe(bob);
    expect(to[0].amount).toBe(700n);
    expect(to[1].url.toString()).toBe(alice);
  });

  it('handles an IssueTokens with only a to list', () => {
    const to = recipientsOfTx(
      txn({ type: 'issueTokens', to: [{ url: alice, amount: 40n }] }),
    );
    expect(to).toHaveLength(1);
    expect(to[0].amount).toBe(40n);
  });

  it.each(['burnTokens', 'syntheticBurnTokens'] as const)(
    'directs a %s at acc://ACME',
    (type) => {
      const to = recipientsOfTx(txn({ type, amount: 250n }));
      expect(to).toHaveLength(1);
      expect(to[0].url.toString().toLowerCase()).toBe('acc://acme');
      expect(to[0].amount).toBe(250n);
    },
  );

  it('converts an AddCredits spend with the executor formula', () => {
    // 10 ACME at oracle 5000 → 500 credits → 50,000 credit balance units.
    // The old display path divided by 1e10 and showed 5 credits instead.
    const to = recipientsOfTx(
      txn({
        type: 'addCredits',
        recipient: bob,
        amount: 1_000_000_000n,
        oracle: 5000,
      }),
    );
    expect(to).toHaveLength(1);
    expect(to[0]).toBeInstanceOf(CreditRecipient);
    expect(to[0].amount).toBe(50_000);
  });

  it.each([
    ['syntheticDepositTokens', TokenRecipient],
    ['syntheticDepositCredits', CreditRecipient],
  ] as const)('directs a %s at the principal', (type, cls) => {
    const to = recipientsOfTx(txn({ type, amount: 90n }, bob));
    expect(to).toHaveLength(1);
    expect(to[0]).toBeInstanceOf(cls);
    expect(to[0].url.toString()).toBe(bob);
  });

  it('reports burnt ACME for a BlockValidatorAnchor', () => {
    const to = recipientsOfTx(
      txn({ type: 'blockValidatorAnchor', acmeBurnt: 42n }, 'acc://dn.acme'),
    );
    expect(to).toHaveLength(1);
    expect(to[0].url.toString().toLowerCase()).toBe('acc://acme');
    expect(to[0].amount).toBe(42n);
  });

  it('returns [] for a BlockValidatorAnchor with nothing burnt', () => {
    expect(
      recipientsOfTx(txn({ type: 'blockValidatorAnchor' }, 'acc://dn.acme')),
    ).toEqual([]);
  });

  it('returns null for types with no recipients', () => {
    expect(recipientsOfTx(txn({ type: 'createIdentity', url: bob }))).toBe(
      null,
    );
    expect(recipientsOfTx(txn({ type: 'writeData' }))).toBe(null);
  });
});

describe('totalAmount', () => {
  const to = [
    new TokenRecipient({ url: alice, amount: 100n }),
    new TokenRecipient({ url: bob, amount: 250n }),
  ];

  it('sums bigint amounts', () => {
    expect(totalAmount(to)).toBe(350n);
  });

  it('sums number amounts as bigint', () => {
    const credits = [
      new CreditRecipient({ url: alice, amount: 3 }),
      new CreditRecipient({ url: bob, amount: 4 }),
    ];
    expect(totalAmount(credits)).toBe(7n);
  });

  it('is exact past Number.MAX_SAFE_INTEGER', () => {
    const big = [
      new TokenRecipient({ url: alice, amount: 9_007_199_254_740_993n }),
      new TokenRecipient({ url: bob, amount: 9_007_199_254_740_993n }),
    ];
    expect(totalAmount(big)).toBe(18_014_398_509_481_986n);
  });

  it('applies the predicate', () => {
    expect(totalAmount(to, (x) => x.url.toString() === bob)).toBe(250n);
  });

  it('treats a missing amount as zero', () => {
    const partial = [new TokenRecipient({ url: alice })];
    expect(totalAmount(partial)).toBe(0n);
  });

  it('sums an empty list to zero', () => {
    expect(totalAmount([])).toBe(0n);
  });
});
