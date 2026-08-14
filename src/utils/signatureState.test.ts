import { describe, expect, it } from 'vitest';

import { messaging } from 'accumulate.js';
import { MessageRecord } from 'accumulate.js/lib/api_v3';

import deliveredRotatedKey from './__fixtures__/delivered-rotated-key.json';
import payPeriod193 from './__fixtures__/pay-period-193.json';
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

const state = computeSignatureState(record.signatures.records);
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
