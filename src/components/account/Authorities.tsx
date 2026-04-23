import { Spin, Tag, Typography } from 'antd';
import React, { useState } from 'react';
import { IconContext } from 'react-icons';
import { RiAccountBoxLine } from 'react-icons/ri';

import { URL } from 'accumulate.js';
import { AccountRecord } from 'accumulate.js/lib/api_v3';
import {
  Account,
  AccountType,
  AuthorityEntry,
  AuthorityEntryArgs,
} from 'accumulate.js/lib/core';

import { getParentUrl } from '../../utils/url';
import Count from '../common/Count';
import { InfiniteList } from '../common/InfiniteList';
import { Link } from '../common/Link';
import { queryEffect } from '../common/query';

const { Title } = Typography;

function Render({
  from,
  authorities,
  inherited = false,
}: {
  from?: URL;
  authorities: AuthorityEntry[];
  inherited?: boolean;
}) {
  return (
    <div>
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiAccountBoxLine />
        </IconContext.Provider>
        Authorities
        <Count count={authorities.length} />
      </Title>
      {inherited && from && (
        <Title level={5} type="secondary" style={{ marginTop: '-10px' }}>
          from {from.toString()}
        </Title>
      )}
      <div style={{ marginBottom: '30px' }}>
        <InfiniteList
          className="ant-list-sm"
          dataSource={authorities}
          renderItem={(item) => (
            <Link to={item.url}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiAccountBoxLine />
              </IconContext.Provider>
              {item.url.toString()}
              {item.disabled ? (
                <Tag color="volcano" style={{ marginLeft: 10 }}>
                  disabled
                </Tag>
              ) : null}
            </Link>
          )}
        />
      </div>
    </div>
  );
}

export default function Authorities(
  props:
    | { items: AuthorityEntryArgs[] }
    | { account: Account; inherited?: boolean },
) {
  if (!('account' in props)) {
    return (
      <Render
        authorities={(props.items || []).map((x) => new AuthorityEntry(x))}
      />
    );
  }
  const { account } = props;
  switch (account.type) {
    case AccountType.Unknown:
    case AccountType.UnknownSigner:

    case AccountType.LiteIdentity:
    case AccountType.LiteTokenAccount:
    case AccountType.LiteDataAccount:

    case AccountType.SystemLedger:
    case AccountType.BlockLedger:
    case AccountType.AnchorLedger:
    case AccountType.SyntheticLedger:
      return null;

    case AccountType.KeyPage:
      const entry = new AuthorityEntry({ url: getParentUrl(account.url) });
      return <Render authorities={[entry]} />;
  }

  if (account.authorities?.length) {
    return (
      <Render
        from={account.url}
        authorities={account.authorities}
        inherited={props.inherited}
      />
    );
  }

  const [parent, setParent] = useState<Account>(null);
  queryEffect(getParentUrl(account.url), { queryType: 'default' }).then((r) =>
    setParent((r as AccountRecord).account),
  );

  if (!parent) {
    return <Spin />;
  }
  return <Authorities account={parent} inherited={true} />;
}
