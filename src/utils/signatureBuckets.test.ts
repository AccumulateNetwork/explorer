import { describe, expect, it } from 'vitest';

import { URL, core, messaging } from 'accumulate.js';
import { MessageRecord } from 'accumulate.js/lib/api_v3';
import { VoteType } from 'accumulate.js/lib/core';

import deliveredPayPeriod193 from './__fixtures__/delivered-pay-period-193.json';
import deliveredRotatedKey from './__fixtures__/delivered-rotated-key.json';
import payPeriod193 from './__fixtures__/pay-period-193.json';
import pendingLiveOlder from './__fixtures__/pending-live-older-version.json';
import pendingVersionBump from './__fixtures__/pending-page-version-bump.json';
import rejected192 from './__fixtures__/rejected-pay-period-192.json';
import {
  AuthorityGroup,
  classifySignatures,
  groupSignatures,
  listedSignatures,
  signatureAuthority,
  voteOf,
} from './signatureBuckets';
import { SigRecord } from './types';

/** The signature sets of a fixture, as the API returns them. */
function setsOf(fixture: unknown) {
  return (
    new MessageRecord(
      fixture as never,
    ) as MessageRecord<messaging.TransactionMessage>
  ).signatures.records;
}

/** The records the table lists — the shipped helper, not a copy of it. */
const listed = (fixture: unknown): SigRecord[] =>
  listedSignatures(setsOf(fixture));

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
  const groups = groupSignatures(
    setsOf(pendingVersionBump),
    [{ url: staking }],
    {
      pending: true,
    },
  ).groups;

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
      groupSignatures(setsOf(rejected192), [{ url: staking }]).groups,
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
    const historical = groupSignatures(
      setsOf(rejected192),
      [{ url: staking }],
      {
        pending: true,
      },
    ).groups.flatMap((x) => x.historical);
    expect(historical).toHaveLength(signatures.length);
    const votes = new Set(historical.map((x) => voteOf(x.message.signature)));
    expect(votes.has(VoteType.Reject)).toBe(true);
    expect(votes.has(VoteType.Accept)).toBe(true);
  });
});

describe('groupSignatures, disabled authorities', () => {
  const groups = groupSignatures(
    setsOf(pendingVersionBump),
    [{ url: staking }, { url: ops, disabled: true }],
    { pending: true },
  ).groups;

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
  const groups = groupSignatures(setsOf(pendingLiveOlder), [{ url: staking }], {
    pending: true,
  }).groups;
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

// Once a transaction finishes, the chain clears the active set, so every
// record is `historical` and the flag separates nothing. Membership is
// reconstructed from the executor's own rules instead (#86).
describe('groupSignatures, on a completed transaction', () => {
  it('does not call the whole distribution historical', () => {
    const signatures = listed(deliveredRotatedKey);
    expect(signatures.every((x) => x.historical)).toBe(true);

    const { groups } = groupSignatures(setsOf(deliveredRotatedKey), [
      { url: staking },
    ]);
    expect(groups.flatMap((x) => x.historical)).toHaveLength(0);
  });

  it('marks a signature by a key since removed from the page', () => {
    // acc://accc878f…@ACME reached 4 of 4 partly on a key that is no longer an
    // entry. `historical` cannot say so here; the page's own key list can.
    const status = classifySignatures(setsOf(deliveredRotatedKey));
    const removed = [...status.values()].filter((x) => x.keyRemoved);
    expect(removed).toHaveLength(1);
    expect(removed[0].counted).toBe(true);
    expect(removed[0].version).toBe(11);
  });

  it('separates the superseded from the counted on period 193', () => {
    // The acceptance case: six records, a threshold of four, and the panel
    // above reads 4 of 4. Before this the table showed one flat list.
    const { groups, status } = groupSignatures(setsOf(deliveredPayPeriod193), [
      { url: staking },
    ]);
    const listedAll = listedSignatures(setsOf(deliveredPayPeriod193));
    expect(listedAll.every((x) => x.historical)).toBe(true);
    expect(listedAll.length).toBeGreaterThan(0);

    const counted = listedAll.filter((x) => status.get(`${x.id}`)?.counted);
    expect(counted.length).toBeGreaterThan(0);
    // Nothing is lost: every record still lands in exactly one group.
    const all = groups.flatMap((g) => [
      ...g.signatures,
      ...g.rejections,
      ...g.historical,
    ]);
    expect(all).toHaveLength(listedAll.length);
  });

  it('marks an accept the signer later overrode with a rejection', () => {
    // rejected-pay-period-192, PennyRocket.acme/book/2, key c339c695: accept
    // at ts=1785519504830, reject at ts=1785540095186. Same key, same version.
    const status = classifySignatures(setsOf(rejected192));
    const overridden = [...status.values()].filter(
      (x) => x.reason === 'overridden',
    );
    expect(overridden).toHaveLength(1);
    expect(overridden[0].counted).toBe(false);
    expect(voteOf(overridden[0].supersededBy!.message.signature)).toBe(
      VoteType.Reject,
    );
  });
});

// The property the reconstruction rests on. The replacement rule is derived
// from the records, so it could in principle contradict the chain; measured
// across every pending fixture it never does. It is sound in one direction
// only, and deliberately: a record can be out of the active set for reasons
// the rules do not cover - consumed upward, cleared on execution - so
// historical does NOT imply replaced.
describe('the replacement rule is sound where the chain can check it', () => {
  for (const [name, fixture] of [
    ['period 196, after the replacing signature', pendingVersionBump],
    ['period 196, one block earlier', pendingLiveOlder],
    ['pay period 193, while pending', payPeriod193],
  ] as const) {
    it(`never claims a replacement the chain still holds — ${name}`, () => {
      const sets = setsOf(fixture);
      const status = classifySignatures(sets, { pending: true });
      for (const record of listedSignatures(sets)) {
        if (status.get(`${record.id}`)?.reason === 'replaced') {
          expect(record.historical).toBe(true);
        }
      }
    });
  }

  it('finds the replacement the chain reports on period 196', () => {
    const sets = setsOf(pendingVersionBump);
    const status = classifySignatures(sets, { pending: true });
    const replaced = listedSignatures(sets).filter(
      (x) => status.get(`${x.id}`)?.reason === 'replaced',
    );
    expect(replaced).toHaveLength(2);
    expect(replaced.every((x) => status.get(`${x.id}`)?.version === 11)).toBe(
      true,
    );
  });

  it('claims no replacement on the record one block earlier', () => {
    // Both signatures are version 11 on a version-12 page and both are LIVE.
    // Comparing against the page version instead would call them dead (#81).
    const sets = setsOf(pendingLiveOlder);
    const status = classifySignatures(sets, { pending: true });
    expect(
      [...status.values()].filter((x) => x.reason === 'replaced'),
    ).toHaveLength(0);
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
