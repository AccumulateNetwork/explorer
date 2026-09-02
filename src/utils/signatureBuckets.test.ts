import { describe, expect, it } from 'vitest';

import { URL, core, messaging } from 'accumulate.js';
import { MessageRecord } from 'accumulate.js/lib/api_v3';

import deliveredRotatedKey from './__fixtures__/delivered-rotated-key.json';
import pendingLiveOlder from './__fixtures__/pending-live-older-version.json';
import pendingVersionBump from './__fixtures__/pending-page-version-bump.json';
import { bucketSignatures, signatureAuthority } from './signatureBuckets';
import { SigRecord, isRecordOf } from './types';

/**
 * The records the Required table lists, gathered the way `Signatures` gathers
 * them: user signatures only — a delegated signature or one carrying a key.
 * Authority signatures are votes, not records the table lists.
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

// Both fixtures are the real mainnet period-196 distribution on acc://ACME,
// whose sole required authority is acc://staking.acme/book.
const required = [URL.parse('acc://staking.acme/book')];

describe('bucketSignatures, on the pending distribution', () => {
  const signatures = listed(pendingVersionBump);
  const b = bucketSignatures(signatures, required, { pending: true });
  const forBook = b.byAuthority.get('acc://staking.acme/book')!;

  it('files everything the chain no longer holds under Invalid', () => {
    // Two version-11 sidecar keys the version-12 signature discarded, plus
    // beastmode's, superseded by a kompendium vote that was itself discarded.
    expect(b.invalid).toHaveLength(3);
    expect(b.invalid.every((x) => x.historical)).toBe(true);
  });

  it('leaves the authority holding only what still counts', () => {
    // The whole defect: this row expanded to four signatures, three of them
    // dead, so a reader counted four valid authority signatures (#82).
    expect(forBook).toHaveLength(1);
    expect(forBook[0].historical).toBeFalsy();
    expect(
      `${signatureAuthority(forBook[0].message.signature)}`.toLowerCase(),
    ).toBe('acc://staking.acme/book');
  });

  it('keeps Other for authorities the transaction does not require', () => {
    // PennyRocket's fresh signature, delegated through dn.acme/operators.
    expect(b.other).toHaveLength(1);
    expect(b.other[0].historical).toBeFalsy();
  });

  it('puts every record in exactly one bucket, losing none', () => {
    const all = [...b.invalid, ...forBook, ...b.other];
    expect(all).toHaveLength(signatures.length);
    expect(new Set(all.map((x) => `${x.id}`)).size).toBe(signatures.length);
  });
});

describe('bucketSignatures, when nothing has been discarded', () => {
  // The same record one block earlier: the page is already version 12 and all
  // three signatures on it were made against version 11 and are still LIVE.
  const b = bucketSignatures(listed(pendingLiveOlder), required, {
    pending: true,
  });

  it('keeps every live signature under its authority', () => {
    expect(b.byAuthority.get('acc://staking.acme/book')).toHaveLength(2);
    expect(
      b.byAuthority.get('acc://staking.acme/book')!.every((x) => !x.historical),
    ).toBe(true);
  });

  it('holds only the superseded signature, not a discarded one', () => {
    // beastmode's key signature is historical here too, but for the benign
    // reason: its page reached its threshold and emitted the authority
    // signature that carries it, and emitting one clears the set. Nothing on
    // this record was discarded — the progress table reads 3 of 4 — so the
    // bucket asserts only what `historical` supports: these do not count.
    expect(b.invalid).toHaveLength(1);
    expect(`${b.invalid[0].id}`).toContain('beastmode.acme/book/1');
  });
});

describe('bucketSignatures, on a delivered transaction', () => {
  // Every signature on a delivered transaction is historical — the active set
  // is cleared on execution (#81). Bucketing by the flag here would report the
  // distribution that actually paid out as entirely invalid.
  const signatures = listed(deliveredRotatedKey);

  it('invalidates nothing, and buckets exactly as it did before', () => {
    const b = bucketSignatures(signatures, required);
    expect(signatures.every((x) => x.historical)).toBe(true);
    expect(b.invalid).toHaveLength(0);
    expect(
      b.byAuthority.get('acc://staking.acme/book')!.length + b.other.length,
    ).toBe(signatures.length);
  });

  it('would empty the authority row if the flag were read here', () => {
    // Guards the gate itself: drop `pending` and this is what users would see.
    const wrong = bucketSignatures(signatures, required, { pending: true });
    expect(wrong.invalid).toHaveLength(signatures.length);
    expect(wrong.byAuthority.get('acc://staking.acme/book')).toHaveLength(0);
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
