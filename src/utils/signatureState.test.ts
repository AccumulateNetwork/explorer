import { describe, expect, it } from 'vitest';

import { messaging } from 'accumulate.js';
import { MessageRecord } from 'accumulate.js/lib/api_v3';

import deliveredRotatedKey from './__fixtures__/delivered-rotated-key.json';
import payPeriod193 from './__fixtures__/pay-period-193.json';
import pendingLiveOlder from './__fixtures__/pending-live-older-version.json';
import pendingVersionBump from './__fixtures__/pending-page-version-bump.json';
import { computeSignatureState } from './signatureState';

// The fixture is the mainnet staking distribution for pay period 193
// (acc://a48119b7…@ACME), captured while pending. It is the acceptance case
// from #76: the old header counted 5 key-signature messages against a
// threshold of 4, so a transaction that cannot execute read as complete.
//
// Its shape covers every case the executor distinguishes:
//   staking.acme/book/2   4-of-7, the governing page
//     kompendium.acme/book   voted — authority signature, itself fed by a
//                            nested delegate (beastmode)
//     TFA.acme/book          voted — likewise, fed by dennis
//     PennyRocket.acme/book  voted — a key on the page signed it directly
//     CodeForj.acme/book     signed but not counted: its page is 1 of 2
//     defacto, governance, HighStakes — nothing

const record = new MessageRecord(
  payPeriod193 as never,
) as MessageRecord<messaging.TransactionMessage>;

const state = computeSignatureState(record.signatures.records, {
  pending: true,
});
const entry = (label: string) =>
  state!.entries.find((x) => x.label.toLowerCase() === label.toLowerCase());

describe('computeSignatureState', () => {
  it('governs by the page that carries the threshold', () => {
    expect(state).not.toBeNull();
    expect(state!.page.toLowerCase()).toBe('acc://staking.acme/book/2');
    expect(state!.threshold).toBe(4);
    expect(state!.entries).toHaveLength(7);
  });

  it('counts votes, not signature messages (#75)', () => {
    // Five key-signature messages exist across the sets; three entries are
    // actually satisfied. The old header showed the former.
    expect(state!.votes).toBe(3);
    expect(state!.votes).toBeLessThan(state!.threshold);
  });

  it('attributes a nested delegate to the entry it voted through (#76)', () => {
    // beastmode signed kompendium's page, which then voted. That is one vote
    // for kompendium — not a separate signer, and not two votes.
    const k = entry('acc://kompendium.acme/book');
    expect(k?.state.kind).toBe('voted');
    expect(k?.state).toMatchObject({ via: 'acc://kompendium.acme/book/1' });

    const t = entry('acc://TFA.acme/book');
    expect(t?.state.kind).toBe('voted');
    expect(t?.state).toMatchObject({ via: 'acc://tfa.acme/book/1' });

    expect(state!.entries.filter((x) => x.state.kind === 'voted')).toHaveLength(
      3,
    );
  });

  it('counts a key signing the page directly as that entry’s vote (#76)', () => {
    const p = entry('acc://PennyRocket.acme/book');
    expect(p?.state).toMatchObject({
      kind: 'voted',
      via: 'a key on this page',
    });
  });

  it('reports a stranded signature with its own page’s progress (#76)', () => {
    // CodeForj's operator signed; their page needs two and has one, so it has
    // emitted nothing. Today this is indistinguishable from a vote.
    expect(entry('acc://CodeForj.acme/book')?.state).toEqual({
      kind: 'signed',
      page: 'acc://CodeForj.acme/book/2',
      have: 1,
      need: 2,
    });
  });

  it('reports entries that have not signed', () => {
    for (const label of [
      'acc://defacto.acme/book',
      'acc://staking.acme/governance',
      'acc://HighStakes.acme/book',
    ]) {
      expect(entry(label)?.state).toEqual({ kind: 'none' });
    }
  });

  it('returns null when there is no governing page to reason about', () => {
    expect(computeSignatureState()).toBeNull();
    expect(computeSignatureState([])).toBeNull();
  });
});

// The same governing page, but an executed transaction: acc://accc878f…@ACME
// reached its threshold of 4 with three delegate votes and one key signing the
// page directly. That key is no longer an entry — the page is on version 11
// and has rotated since. The account in the response is today's page, not the
// page that was signed, so matching votes against it alone under-reports an
// executed transaction as 3 of 4.
describe('computeSignatureState, after the page has changed', () => {
  const executed = computeSignatureState(
    (
      new MessageRecord(
        deliveredRotatedKey as never,
      ) as MessageRecord<messaging.TransactionMessage>
    ).signatures.records,
  );

  it('counts a vote from a key since rotated off the page', () => {
    expect(executed!.threshold).toBe(4);
    expect(executed!.votes).toBe(4);
    expect(executed!.votes).toBeGreaterThanOrEqual(executed!.threshold);
  });

  it('says why that vote does not line up with the page', () => {
    const orphan = executed!.entries.find((x) => x.label.startsWith('key '));
    expect(orphan?.state).toMatchObject({
      kind: 'voted',
      via: 'a key that is no longer an entry on this page',
    });
  });
});

// acc://11a685e4…@ACME, the staking distribution that was pending when
// acc://saisne.acme/book was added to acc://staking.acme/book/2. The page went
// from version 11 with 7 entries to version 12 with 8; saisne's signature, the
// first at version 12, REPLACED the active set rather than joining it, so the
// three version-11 votes already on the page were discarded. The response
// still carries them, flagged `historical`, and counting them rendered a
// stalled distribution as 4 of 4 in green (#81).
describe('computeSignatureState, after the page version was bumped', () => {
  const sets = (
    new MessageRecord(
      pendingVersionBump as never,
    ) as MessageRecord<messaging.TransactionMessage>
  ).signatures.records;

  const pending = computeSignatureState(sets, { pending: true });
  const at = (label: string) =>
    pending!.entries.find((x) => x.label.toLowerCase() === label.toLowerCase());

  it('counts only the signatures the executor still holds', () => {
    expect(pending!.page.toLowerCase()).toBe('acc://staking.acme/book/2');
    expect(pending!.version).toBe(12);
    expect(pending!.threshold).toBe(4);
    expect(pending!.votes).toBe(1);
    expect(pending!.invalidated).toBe(3);
  });

  it('reports the discarded votes as discarded, not as votes', () => {
    // A delegate's authority signature, delivered to the page and then dropped.
    expect(at('acc://kompendium.acme/book')?.state).toMatchObject({
      kind: 'invalidated',
      via: 'acc://kompendium.acme/book/1',
    });

    // A key on the page signing it directly — the version it signed against is
    // in the signature, so say which one.
    expect(at('acc://CodeForj.acme/book')?.state).toMatchObject({
      kind: 'invalidated',
      via: 'a key on this page',
      signedVersion: 11,
    });
  });

  it('keeps the live vote', () => {
    expect(at('acc://saisne.acme/book')?.state).toMatchObject({
      kind: 'voted',
      vote: 'accept',
      via: 'a key on this page',
    });
  });

  it('still reports a fresh signature accumulating on the delegate’s page', () => {
    // PennyRocket's sidecar vote died with the version bump, but they have a
    // new signature part-way through their own page. Both facts matter.
    expect(at('acc://PennyRocket.acme/book')?.state).toMatchObject({
      kind: 'invalidated',
      signedVersion: 11,
      progress: {
        page: 'acc://PennyRocket.acme/book/3',
        have: 1,
        need: 2,
      },
    });
  });

  it('reports entries that never signed as such', () => {
    for (const label of [
      'acc://defacto.acme/book',
      'acc://staking.acme/governance',
      'acc://TFA.acme/book',
      'acc://HighStakes.acme/book',
    ]) {
      expect(at(label)?.state).toEqual({ kind: 'none' });
    }
  });

  it('does not apply the flag to a transaction that has executed', () => {
    // The trap: EVERY signature on a delivered transaction is historical,
    // because the active set is cleared when it executes. Reading the flag
    // there would report the transaction that paid out as unsigned.
    const delivered = computeSignatureState(
      (
        new MessageRecord(
          deliveredRotatedKey as never,
        ) as MessageRecord<messaging.TransactionMessage>
      ).signatures.records,
      { pending: true },
    );
    expect(delivered!.votes).toBe(0);

    // Which is why the caller passes the transaction's status, and the
    // delivered case does not opt in.
    expect(computeSignatureState(sets)!.votes).toBe(4);
  });
});

// The same distribution, one signature earlier — and the case that makes the
// obvious rule dangerous. The page was ALREADY version 12 (saisne had been
// installed) while all three signatures on it were made against version 11,
// and the chain still counted every one of them: 3 of 4. Bumping a page's
// version unmakes nothing on its own. `addSignature` replaces a signer's
// active set only when a signature at a HIGHER version arrives, and that is
// what saisne's signature then did, taking this to 1 of 4.
//
// Judging by `signerVersion < page.version` gets this fixture exactly
// backwards, calling three live votes dead. The staking signer shipped that
// rule and measured a real 3-of-4 destroyed by it: told to sign again, each
// validator's replacement discarded the other two (core/staking!481). Only the
// node's `historical` flag is a verdict; `signedVersion` is explanation.
//
// Derived from the fixture above by removing saisne's version-12 signature and
// clearing the flag the arrival of that signature set — i.e. the same record,
// one block earlier. It matches core/staking's tx196-before-resign.json set
// for set, and both implementations tally it at 3.
describe('computeSignatureState, live signatures at an older version', () => {
  const older = computeSignatureState(
    (
      new MessageRecord(
        pendingLiveOlder as never,
      ) as MessageRecord<messaging.TransactionMessage>
    ).signatures.records,
    { pending: true },
  );

  it('counts a live signature whose version is older than the page’s', () => {
    expect(older!.version).toBe(12);
    expect(older!.votes).toBe(3);
    expect(older!.invalidated).toBe(0);
  });

  it('does not invalidate anything merely because the page moved on', () => {
    for (const label of [
      'acc://kompendium.acme/book',
      'acc://CodeForj.acme/book',
      'acc://PennyRocket.acme/book',
    ]) {
      expect(
        older!.entries.find(
          (x) => x.label.toLowerCase() === label.toLowerCase(),
        )?.state.kind,
      ).toBe('voted');
    }
  });
});
