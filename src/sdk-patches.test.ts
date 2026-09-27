import { describe, expect, it } from 'vitest';

import { NetworkStatus } from 'accumulate.js/lib/api_v3';
import { ExecutorVersion } from 'accumulate.js/lib/core';

import './sdk-patches';

// A network running an executor version newer than the SDK must still load.
// The patch once replaced only ExecutorVersion.byName, but the SDK decodes
// through fromObject, which calls its own module-local byName, so the patch
// was never reached: Kermit's 'v2-kourou' threw on every network-status call
// and its badge sat at "not live" while the network was healthy (#87).
const FUTURE = 'v9-not-yet-released';

describe('sdk-patches: an executor version the SDK does not know', () => {
  it('decodes a network status instead of throwing', () => {
    const status = new NetworkStatus({
      executorVersion: FUTURE,
      bvnExecutorVersions: [{ partition: 'BVN1', version: FUTURE }],
    });

    expect(status.executorVersion).toBe(-1);
    expect(status.bvnExecutorVersions?.[0]?.version).toBe(-1);
  });

  it('names it unknown on the way back out', () => {
    const status = new NetworkStatus({ executorVersion: FUTURE });

    expect(status.asObject().executorVersion).toBe('unknown');
  });

  it('leaves known versions alone', () => {
    expect(ExecutorVersion.fromObject('v2-jiuquan')).toBe(
      ExecutorVersion.V2Jiuquan,
    );
    expect(ExecutorVersion.getName(ExecutorVersion.V2Jiuquan)).toBe(
      'v2-jiuquan',
    );
  });
});
