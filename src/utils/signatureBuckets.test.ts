import { describe, expect, it } from 'vitest';

import { URL, core, messaging } from 'accumulate.js';
import { MessageRecord } from 'accumulate.js/lib/api_v3';
import { VoteType } from 'accumulate.js/lib/core';

import deliveredRotatedKey from './__fixtures__/delivered-rotated-key.json';
import pendingLiveOlder from './__fixtures__/pending-live-older-version.json';
import pendingVersionBump from './__fixtures__/pending-page-version-bump.json';
import rejected192 from './__fixtures__/rejected-pay-period-192.json';
import {
  AuthorityGroup,
  groupSignatures,
  signatureAuthority,
  voteOf,
} from './signatureBuckets';
import { SigRecord, isRecordOf } from './types';

/**
 * The records the table lists, gathered the way `Signatures` gathers them:
 * user signatures only — delegated, or carrying a key. Authority signatures
 * are the authority's vote and drive the row's status tag instead.
 */
function listed(fixture: unknown): SigRecord[] {
  const record = new MessageRecord(
    fixture as never,
  ) as MessageRecord<messaging.TransactionMessage>;
  const out: SigRecord[] = [];
  for (const set of record.signatures?.records || []) {
    for (const sig of set.signatures?.records || []) {
      if (!isRecordOf(sig, messaging.SignatureMessage)) continue;
      if (
        sig.message.signature instanceof core.DelegatedSignature ||
        'publicKey' in sig.message.signature
      ) {
        out.push(sig as SigRecord);
      }
    }
  }
  return out;
}

const staking = URL.parse('acc://staking.acme/book');
const ops = URL.parse('acc://ops.acme/book');
const at = (groups: AuthorityGroup[], url: string) =>
  groups.find((x) => `${x.authority}`.toLowerCase() === url)!;
const total = (g: AuthorityGroup) =>
  g.signatures.length + g.rejections.length + g.historical.length;

// The real mainnet period-196 distribution on acc://ACME, whose sole required
// authority is acc://staking.acme/book. Its page moved from version 11 to 12
// and a version-12 signature replaced the active set.
describe('groupSignatures, on the pending distribution', () => {
  const signatures = listed(pendingVersionBump);
  const groups = groupSignatures(signatures, [{ url: staking }], {
    pending: true,
  });

  it('gives the required authority its own row', () => {
    const g = at(groups, 'acc://staking.acme/book');
    expect(g.kind).toBe('required');
    expect(g.signatures).toHaveLength(1);
    expect(g.rejections).toHaveLength(0);
    expect(g.historical).toHaveLength(3);
  });

  it('gives a book that is not an authority its own row, not a catch-all', () => {
    // PennyRocket's fresh signature, delegated through dn.acme/operators.
    const g = at(groups, 'acc://dn.acme/operators');
    expect(g.kind).toBe('other');
    expect(g.signatures).toHaveLength(1);
  });

  it('orders required authorities before the rest', () => {
    expect(groups.map((x) => x.kind)).toEqual(['required', 'other']);
  });

  it('places every record exactly once, losing none', () => {
    const all = groups.flatMap((g) => [
      ...g.signatures,
      ...g.rejections,
      ...g.historical,
    ]);
    expect(all).toHaveLength(signatures.length);
    expect(new Set(all.map((x) => `${x.id}`)).size).toBe(signatures.length);
  });
});

// Pay period 192, acc://6ab38d74…@ACME — a real transaction that was rejected
// and expired. PennyRocket's page carries an accept and then two rejects: the
// signer voted, then voted again.
describe('groupSignatures, on a transaction with real rejections', () => {
  const signatures = listed(rejected192);

  it('carves rejections out of the signature list', () => {
    const g = at(
      groupSignatures(signatures, [{ url: staking }]),
      'acc://staking.acme/book',
    );
    expect(g.rejections.length).toBeGreaterThan(0);
    expect(
      g.rejections.every(
        (x) => voteOf(x.message.signature) !== VoteType.Accept,
      ),
    ).toBe(true);
    expect(
      g.signatures.every(
        (x) => voteOf(x.message.signature) === VoteType.Accept,
      ),
    ).toBe(true);
  });

  it('reads the vote through the delegation that wraps it', () => {
    // The rejections here are delegated signatures; the vote sits on the key
    // signature inside, so reading the outer one finds nothing.
    const rejects = signatures.filter(
      (x) => voteOf(x.message.signature) === VoteType.Reject,
    );
    expect(rejects.length).toBeGreaterThan(0);
    expect(
      rejects.some(
        (x) => x.message.signature instanceof core.DelegatedSignature,
      ),
    ).toBe(true);
  });

  it('keeps a rejection in Historical when it has left the active set', () => {
    // The point of the group: Historical is not "the accepts that died". A
    // signer who rejects and then signs again leaves the rejection here, so
    // the list has to say which vote each record carried.
    const historical = groupSignatures(signatures, [{ url: staking }], {
      pending: true,
    }).flatMap((x) => x.historical);
    expect(historical).toHaveLength(signatures.length);
    const votes = new Set(historical.map((x) => voteOf(x.message.signature)));
    expect(votes.has(VoteType.Reject)).toBe(true);
    expect(votes.has(VoteType.Accept)).toBe(true);
  });
});

describe('groupSignatures, disabled authorities', () => {
  const groups = groupSignatures(
    listed(pendingVersionBump),
    [{ url: staking }, { url: ops, disabled: true }],
    { pending: true },
  );

  it('lists a disabled authority even with nothing signed for it', () => {
    const g = at(groups, 'acc://ops.acme/book');
    expect(g.kind).toBe('disabled');
    expect(total(g)).toBe(0);
  });

  it('orders required, then disabled, then other', () => {
    expect(groups.map((x) => x.kind)).toEqual([
      'required',
      'disabled',
      'other',
    ]);
  });
});

describe('groupSignatures, on the healthy record one block earlier', () => {
  // The page is already version 12 and both sidecar signatures on it were made
  // against version 11 and are still LIVE — nothing was replaced, and the
  // progress table reads 3 of 4. A version comparison would call them dead.
  const groups = groupSignatures(listed(pendingLiveOlder), [{ url: staking }], {
    pending: true,
  });
  const g = at(groups, 'acc://staking.acme/book');

  it('counts a live signature whose version is older than the page’s', () => {
    expect(g.signatures).toHaveLength(2);
    expect(g.signatures.every((x) => !x.historical)).toBe(true);
  });

  it('files beastmode’s consumed signature as historical, by the flag', () => {
    // beastmode's key signature left its own active set because its page
    // reached threshold and emitted the authority signature carrying it —
    // success, not a broken rule. The chain reports it as `historical` all the
    // same, and we take the chain's answer rather than inferring the cause.
    // What the group asserts is exactly what the flag supports: this is not in
    // the active set, so it does not count toward the threshold.
    expect(g.historical).toHaveLength(1);
    expect(`${g.historical[0].id}`).toContain('beastmode.acme/book/1');
  });
});

describe('groupSignatures, on a delivered transaction', () => {
  // Every signature on a delivered transaction is historical: the active set
  // is cleared on execution (#81). The `pending` gate is the one rule of our
  // own, and this is what it is for.
  const signatures = listed(deliveredRotatedKey);

  it('files nothing as historical', () => {
    expect(signatures.every((x) => x.historical)).toBe(true);
    const groups = groupSignatures(signatures, [{ url: staking }]);
    expect(groups.flatMap((x) => x.historical)).toHaveLength(0);
  });

  it('would file the whole distribution as historical without the gate', () => {
    const wrong = groupSignatures(signatures, [{ url: staking }], {
      pending: true,
    });
    expect(wrong.flatMap((x) => x.historical)).toHaveLength(signatures.length);
  });
});

describe('signatureAuthority', () => {
  it('strips the page number to name the book', () => {
    const [sig] = listed(pendingVersionBump)
      .map((x) => x.message.signature)
      .filter((x): x is core.KeySignature => 'publicKey' in x);
    expect(`${sig.signer}`.toLowerCase()).toBe('acc://staking.acme/book/2');
    expect(`${signatureAuthority(sig)}`.toLowerCase()).toBe(
      'acc://staking.acme/book',
    );
  });
});
