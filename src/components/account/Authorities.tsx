import { Spin, Tag, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
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

/** The explicit authority list, for the account types that carry one. */
function explicitAuthorities(account: Account): AuthorityEntry[] | undefined {
  return 'authorities' in account ? account.authorities : undefined;
}

/** Account types that render no authorities section at all. */
const noAuthoritySection = new Set([
  AccountType.Unknown,
  AccountType.UnknownSigner,

  AccountType.LiteIdentity,
  AccountType.LiteTokenAccount,
  AccountType.LiteDataAccount,

  AccountType.SystemLedger,
  AccountType.BlockLedger,
  AccountType.AnchorLedger,
  AccountType.SyntheticLedger,
]);

export default function Authorities(
  props:
    | { items: AuthorityEntryArgs[] }
    | { account: Account; inherited?: boolean },
) {
  const account = 'account' in props ? props.account : undefined;

  // An account with no explicit authorities inherits them from its parent,
  // which must be queried.
  const wantsParent =
    !!account &&
    !noAuthoritySection.has(account.type) &&
    account.type !== AccountType.KeyPage &&
    !explicitAuthorities(account)?.length;

  // The hooks must run on every render, before any conditional return: this
  // component instance is reused across navigations, and with four early
  // returns above them the hook count changed whenever the account kind
  // changed, killing the page with "Rendered more hooks than during the
  // previous render" (#46). Reset the parent when the target changes so one
  // account's authorities are never shown against another's page.
  const [parent, setParent] = useState<Account>(null);
  const parentUrl = wantsParent ? getParentUrl(account.url) : null;
  useEffect(() => setParent(null), [`${parentUrl}`]);
  queryEffect(parentUrl, { queryType: 'default' }).then((r) =>
    setParent((r as AccountRecord).account),
  );

  if (!('account' in props)) {
    return (
      <Render
        authorities={(props.items || []).map((x) => new AuthorityEntry(x))}
      />
    );
  }

  if (noAuthoritySection.has(account.type)) {
    return null;
  }

  if (account.type === AccountType.KeyPage) {
    const entry = new AuthorityEntry({ url: getParentUrl(account.url) });
    return <Render authorities={[entry]} />;
  }

  const authorities = explicitAuthorities(account);
  if (authorities?.length) {
    return (
      <Render
        from={account.url}
        authorities={authorities}
        inherited={props.inherited}
      />
    );
  }

  if (!parent) {
    return <Spin />;
  }
  return <Authorities account={parent} inherited={true} />;
}
