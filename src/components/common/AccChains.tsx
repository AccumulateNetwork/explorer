import { URLArgs } from 'accumulate.js';
import { TokenAccount } from 'accumulate.js/lib/core';
import { Skeleton, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiExchangeLine, RiShieldCheckLine, RiTimerLine } from 'react-icons/ri';
import useAsyncEffect from 'use-async-effect';

import { Chain } from './Chain';
import Count from './Count';
import RPC from './RPC';

const { Title, Text } = Typography;

function withQuery(scope, query, callback, deps) {
  useAsyncEffect(async (mounted) => {
    const r = await RPC.request(
      'query',
      {
        scope: scope.toString(),
        query,
      },
      'v3',
    );
    if (!mounted()) return;
    callback(r);
  }, deps);
}

export function AccChains({ account }: { account: URLArgs }) {
  const [pendingCount, setPendingCount] = useState(null);
  const [count, setCount] = useState({
    main: null,
    scratch: null,
    signature: null,
  });

  withQuery(
    account,
    {
      queryType: 'pending',

      // We only want the total number
      range: {
        count: 0,
        expand: false,
      },
    },
    (r) => {
      setPendingCount(r.total);
    },
    [account],
  );

  withQuery(
    account,
    { queryType: 'chain' },
    (r) => {
      const counts = {
        main: 0,
        scratch: 0,
        signature: 0,
      };
      for (const { name, count } of r.records) {
        if (count) {
          counts[name] = count;
        }
      }
      setCount(counts);
    },
    [account],
  );

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
          <Chain url={account} type="pending" />
        </div>
      )}

      <Title level={4} style={{ marginTop: 30 }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiExchangeLine />
        </IconContext.Provider>
        Transactions
        <Count count={count.main} />
      </Title>
      <Chain url={account} type="main" />

      {count.scratch > 0 && (
        <div>
          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiExchangeLine />
            </IconContext.Provider>
            Scratch transactions
            <Count count={count.scratch} />
          </Title>
          <Chain url={account} type="scratch" />
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
          <Chain url={account} type="signature" />
        </div>
      )}
    </div>
  );
}
