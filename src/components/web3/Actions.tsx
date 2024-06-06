import { DownOutlined, PlayCircleTwoTone } from '@ant-design/icons';
import { Button, Dropdown, DropdownProps, Space } from 'antd';
import { MenuItemType } from 'antd/lib/menu/hooks/useItems';
import React, { useContext, useEffect, useState } from 'react';

import { URL, URLArgs, core } from 'accumulate.js';
import { JsonRpcClient, RecordType } from 'accumulate.js/lib/api_v3';
import {
  AccountType,
  AuthorityEntry,
  KeyPage,
  KeySpec,
  LiteIdentity,
} from 'accumulate.js/lib/core';

import { Shared } from '../common/Network';
import { queryEffect } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import * as web3 from './Account';
import { AddCredits } from './AddCredits';
import { SendTokens } from './SendTokens';
import { useWeb3 } from './useWeb3';

interface Signer {
  signer: KeyPage | LiteIdentity;
  entry: KeySpec;
}

interface ToFrom {
  to?: URLArgs;
  from?: URLArgs;
}

export function Actions(props: { account: URL }) {
  const web3 = useWeb3();
  const [acc, setAcc] = useState<core.Account>();
  const [signers, setSigners] = useState<Signer[]>([]);
  const [items, setItems] = useState<DropdownProps['menu']['items']>([]);
  const [open, setOpen] = useState<string>(null);
  const [toFrom, setToFrom] = useState<ToFrom>({});

  queryEffect(props.account).then((r) => {
    if (r.recordType === RecordType.Account) {
      setAcc(r.account);
    }
  });

  const item = ({
    label,
    open,
    to,
    from,
  }: { label: string; open: string } & ToFrom): MenuItemType => {
    return {
      key: label,
      label: (
        <a
          onClick={(e) => {
            e.preventDefault();
            setToFrom({ to, from });
            setOpen(open);
          }}
          children={label}
        />
      ),
    };
  };

  useEffect(() => {
    switch (acc?.type) {
      case AccountType.TokenAccount:
      case AccountType.LiteTokenAccount:
        setItems([
          item({ label: 'Send tokens', open: 'sendTokens', from: acc.url }),
          item({ label: 'Receive tokens', open: 'sendTokens', to: acc.url }),
          item({
            label: 'Purchase credits',
            open: 'addCredits',
            from: acc.url,
          }),
        ]);
        break;

      case AccountType.LiteIdentity:
      case AccountType.KeyPage:
        setItems([
          item({ label: 'Purchase credits', open: 'addCredits', to: acc.url }),
        ]);
        break;
    }
  }, [acc]);

  const { api } = useContext(Shared);
  useAsyncEffect(
    async (mounted) => {
      setSigners([]);
      if (!web3?.linked?.books || !acc) {
        return;
      }
      const signers = await getSigners(api, web3, acc);
      if (!mounted()) {
        return;
      }
      setSigners(signers);
    },
    [web3, acc, items],
  );

  if (!items.length || !signers.length) {
    return false;
  }

  const { signer } = signers[0];
  return (
    <>
      <Dropdown className="web3-actions" menu={{ items }}>
        <a onClick={(e) => e.preventDefault()}>
          <Space>
            <PlayCircleTwoTone twoToneColor="#60b820" />
          </Space>
        </a>
      </Dropdown>

      {/* Modals */}
      {open === 'sendTokens' && (
        <SendTokens
          {...toFrom}
          open={open === 'sendTokens'}
          onCancel={() => setOpen(null)}
          onFinish={() => setOpen(null)}
          signer={{
            signer: signer.url,
            signerVersion: signer instanceof KeyPage ? signer.version : 1,
          }}
        />
      )}

      {open === 'addCredits' && (
        <AddCredits
          {...toFrom}
          open={open === 'addCredits'}
          onCancel={() => setOpen(null)}
          onFinish={() => setOpen(null)}
          signer={{
            signer: signer.url,
            signerVersion: signer instanceof KeyPage ? signer.version : 1,
          }}
        />
      )}
    </>
  );
}

async function getSigners(
  api: JsonRpcClient,
  web3: web3.Account,
  acc: core.Account,
) {
  const authorities = await resolveAuthorities(api, acc);
  if (!authorities) {
    return;
  }

  // if (web3?.liteIdentity && authorities.some(({ url}) => web3.liteIdUrl.equals(url)))
  const ethKeyHash = web3.ethereum.replace(/^0x/, '').toLowerCase();
  return [
    ...(authorities.some(({ url }) => web3?.liteIdentity?.url.equals(url))
      ? [
          {
            signer: web3.liteIdentity,
            entry: new KeySpec({ publicKeyHash: ethKeyHash }),
          },
        ]
      : []),
    ...(web3?.linked?.books || [])
      .filter(({ book }) => authorities.some(({ url }) => book.url.equals(url)))
      .flatMap(({ pages }) => pages)
      .flatMap((page) =>
        page.keys.flatMap((entry) => ({ signer: page, entry })),
      )
      .filter(
        ({ entry }) =>
          Buffer.from(entry.publicKeyHash).toString('hex') === ethKeyHash,
      ),
  ];
}

async function resolveAuthorities(api: JsonRpcClient, account: core.Account) {
  const s = account.url.toString().replace(/^acc:\/\//, '');
  const i = s.lastIndexOf('/');
  switch (account.type) {
    case AccountType.KeyPage:
      return [
        new AuthorityEntry({
          url: s.substring(0, i),
        }),
      ];

    case AccountType.Identity:
    case AccountType.TokenIssuer:
    case AccountType.TokenAccount:
    case AccountType.KeyBook:
    case AccountType.DataAccount:
      if (account.authorities?.length) {
        return account.authorities;
      }
      if (i < 0) {
        return false;
      }
      const r = await api.query(s.substring(0, i));
      if (r.recordType !== RecordType.Account) {
        return false;
      }
      return resolveAuthorities(api, r.account);

    case AccountType.LiteTokenAccount:
      return [new AuthorityEntry({ url: account.url.authority })];
    case AccountType.LiteIdentity:
      return [new AuthorityEntry({ url: account.url })];
    default:
      return false;
  }
}
