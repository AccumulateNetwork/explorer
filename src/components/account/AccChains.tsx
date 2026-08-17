import { Typography } from 'antd';
import React, { useState } from 'react';
import { IconContext } from 'react-icons';
import { RiExchangeLine, RiShieldCheckLine, RiTimerLine } from 'react-icons/ri';

import { URLArgs } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import { Account } from 'accumulate.js/lib/core';

import Count from '../common/Count';
import { WhenVisible } from '../common/WhenVisible';
import { queryEffect } from '../common/query';
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
  const [pendingCount, setPendingCount] = useState(null);
  const [count, setCount] = useState({
    main: null,
    scratch: null,
    signature: null,
  });

  queryEffect(account, {
    queryType: 'pending',
    range: { count: 0 },
  }).then((r) => {
    if (r.recordType !== RecordType.Range) {
      return;
    }
    setPendingCount(r.total);
  });

  queryEffect(account, { queryType: 'chain' }).then((r) => {
    if (r.recordType !== RecordType.Range) {
      return;
    }

    const counts = {
      main: 0,
      scratch: 0,
      signature: 0,
    };
    for (const { name, count } of r.records || []) {
      if (count) {
        counts[name] = count;
      }
    }
    setCount(counts);
  });

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
