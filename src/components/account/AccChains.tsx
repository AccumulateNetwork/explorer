import { Typography } from 'antd';
import React, { useMemo } from 'react';
import { IconContext } from 'react-icons';
import { RiExchangeLine, RiShieldCheckLine, RiTimerLine } from 'react-icons/ri';

import { URLArgs } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import { Account } from 'accumulate.js/lib/core';

import Count from '../common/Count';
import { WhenVisible } from '../common/WhenVisible';
import { useQuery } from '../common/useQuery';
import { Chain } from './Chain';

const { Title } = Typography;

export function AccChains({
  account,
  record,
}: {
  account: URLArgs;
  /** The loaded account, passed to each Chain so it need not re-query (#57). */
  record?: Account;
}) {
  const pending = useQuery(account, {
    queryType: 'pending',
    range: { count: 0 },
  });
  const chains = useQuery(account, { queryType: 'chain' });

  // Both counts are read straight off the record, so they are derived rather
  // than mirrored into state. `null` means "not known yet" and drives the
  // placeholder, which is why an error record leaves them null.
  const pendingCount =
    pending.data?.recordType === RecordType.Range ? pending.data.total : null;

  const count = useMemo(() => {
    const counts = { main: null, scratch: null, signature: null };
    if (chains.data?.recordType !== RecordType.Range) {
      return counts;
    }
    counts.main = counts.scratch = counts.signature = 0;
    for (const { name, count } of chains.data.records || []) {
      if (count) {
        counts[name] = count;
      }
    }
    return counts;
  }, [chains.data]);

  return (
    <div>
      {(pendingCount === null || pendingCount > 0) && (
        <div>
          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiTimerLine />
            </IconContext.Provider>
            Pending
            <Count count={pendingCount} />
          </Title>
          <WhenVisible>
            <Chain url={account} type="pending" />
          </WhenVisible>
        </div>
      )}

      <Title level={4} style={{ marginTop: 30 }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiExchangeLine />
        </IconContext.Provider>
        Transactions
        <Count count={count.main} />
      </Title>
      <Chain url={account} type="main" account={record} />

      {count.scratch > 0 && (
        <div>
          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiExchangeLine />
            </IconContext.Provider>
            Scratch transactions
            <Count count={count.scratch} />
          </Title>
          <WhenVisible>
            <Chain url={account} type="scratch" account={record} />
          </WhenVisible>
        </div>
      )}

      {(count.signature === null || count.signature > 0) && (
        <div>
          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiShieldCheckLine />
            </IconContext.Provider>
            Signatures
            <Count count={count.signature} />
          </Title>
          <WhenVisible>
            <Chain url={account} type="signature" />
          </WhenVisible>
        </div>
      )}
    </div>
  );
}
