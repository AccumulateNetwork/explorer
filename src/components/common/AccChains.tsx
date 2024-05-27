import { Typography } from 'antd';
import React, { useState } from 'react';
import { IconContext } from 'react-icons';
import { RiExchangeLine, RiShieldCheckLine, RiTimerLine } from 'react-icons/ri';

import { URLArgs } from 'accumulate.js';

import { Chain } from './Chain';
import Count from './Count';
import { queryEffect } from './Shared';

const { Title } = Typography;

export function AccChains({ account }: { account: URLArgs }) {
  const [pendingCount, setPendingCount] = useState(null);
  const [count, setCount] = useState({
    main: null,
    scratch: null,
    signature: null,
  });

  queryEffect(account, {
    queryType: 'pending',
    range: { count: 0 },
  }).then(({ total }) => {
    setPendingCount(total);
  });

  queryEffect(account, { queryType: 'chain' }).then(({ records }) => {
    const counts = {
      main: 0,
      scratch: 0,
      signature: 0,
    };
    for (const { name, count } of records) {
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
