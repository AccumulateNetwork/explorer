import { Button, Typography } from 'antd';
import React from 'react';
import { useState } from 'react';
import { IconContext } from 'react-icons';
import { RiAccountCircleLine } from 'react-icons/ri';

import { URLArgs } from 'accumulate.js';
import { TokenIssuer } from 'accumulate.js/lib/core';

import { Amount, CreditAmount, TokenAmount } from '../common/Amount';
import { Link } from '../common/Link';

const { Paragraph } = Typography;

interface Output {
  url?: URLArgs;
  amount?: number | bigint;
}

export function Outputs({
  outputs,
  issuer,
  credits = false,
}: {
  outputs: Output[];
  issuer?: TokenIssuer;
  credits?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);

  const items = outputs.map((item, index) => (
    <Outputs.Output
      key={`${index}`}
      {...item}
      issuer={issuer}
      credits={credits}
    />
  ));

  const limit = 5;
  if (showAll || items.length <= limit) {
    return <span className="break-all">{items}</span>;
  }

  return (
    <span className="break-all">
      {items.slice(0, limit)}
      <Paragraph key={'more'}>
        <Button onClick={() => setShowAll(true)}>
          +{items.length - limit} more
        </Button>
      </Paragraph>
    </span>
  );
}

Outputs.Output = function ({
  url,
  ...rest
}: {
  url?: URLArgs;
  amount?: number | bigint;
  issuer?: TokenIssuer;
  credits?: boolean;
}) {
  return (
    <Paragraph>
      <Link to={url}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiAccountCircleLine />
        </IconContext.Provider>
        {url.toString()}
      </Link>
      <br />
      <Outputs.Amount {...rest} />
      <br />
      <Outputs.Amount
        {...rest}
        digits={{ min: 2, max: 2, group: true }}
        className="formatted-balance"
      />
    </Paragraph>
  );
};

Outputs.Amount = function ({
  amount = 0,
  issuer,
  credits,
  ...props
}: Omit<Parameters<typeof CreditAmount>[0], 'amount'> &
  Omit<Parameters<typeof Outputs>[0], 'outputs'> & {
    amount?: number | bigint;
  }) {
  if (credits) {
    return <CreditAmount amount={amount} {...props} />;
  }
  if (issuer) {
    return <TokenAmount amount={amount} issuer={issuer} {...props} />;
  }
  return <Amount label="(unknown)" amount={Number(amount)} {...props} />;
};
