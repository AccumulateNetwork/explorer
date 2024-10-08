import { Typography } from 'antd';
import React, { useState } from 'react';
import { IconContext } from 'react-icons';
import { RiExchangeLine, RiShieldCheckLine, RiTimerLine } from 'react-icons/ri';

import { URLArgs } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';

import Count from '../common/Count';
import { queryEffect } from '../common/query';
import { Chain } from './Chain';
import { Pending } from './Pending';

const { Title } = Typography;

export function AccChains({ account }: { account: URLArgs }) {
  const [count, setCount] = useState({
    main: null,
    scratch: null,
    signature: null,
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
      <Pending url={account} />

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
