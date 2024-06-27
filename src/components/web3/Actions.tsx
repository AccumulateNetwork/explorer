import { PlayCircleTwoTone } from '@ant-design/icons';
import { Dropdown, DropdownProps, Typography } from 'antd';
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

import { Network } from '../common/Network';
import { queryEffect } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { AddCredits } from '../form/AddCredits';
import { SendTokens } from '../form/SendTokens';
import { Context, useWeb3 } from './Context';

const { Text } = Typography;

interface Signer {
  signer: KeyPage | LiteIdentity;
  entry: KeySpec;
}

interface ToFrom {
  to?: URLArgs;
  from?: URLArgs;
}

export default Actions;

export function Actions(props: { account: URL }) {
  type FormKey = 'addCredits' | 'sendTokens';
  const web3 = useWeb3();
  const [acc, setAcc] = useState<core.Account>();
  const [signers, setSigners] = useState<Signer[]>([]);
  const [items, setItems] = useState<DropdownProps['menu']['items']>([]);
  const [toFrom, setToFrom] = useState<ToFrom>({});
  const [open, setOpen] = useState<FormKey>();

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
  }: { label: string; open: FormKey } & ToFrom): MenuItemType => {
    return {
      key: label,
      label: <Text>{label}</Text>,
      onClick() {
        setToFrom({ to, from });
        setOpen(open);
      },
    };
  };

  useEffect(() => {
    switch (acc?.type) {
      case AccountType.TokenAccount:
      case AccountType.LiteTokenAccount:
        setItems([
          item({ label: 'Send tokens', open: 'sendTokens', from: acc.url }),
          item({
            label: 'Purchase credits',
            open: 'addCredits',
            from: acc.url,
          }),
        ]);
        break;
    }
  }, [acc]);

  const { api } = useContext(Network);
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
        <PlayCircleTwoTone
          style={{ cursor: 'pointer' }}
          twoToneColor="#60b820"
        />
      </Dropdown>

      {/* Modals */}
      {open === 'sendTokens' && (
        <SendTokens
          {...toFrom}
          open={open === 'sendTokens'}
          onCancel={() => setOpen(null)}
          onFinish={(ok) => ok && setOpen(null)}
          signer={{
            signer: signer.url,
            signerVersion: signer instanceof KeyPage ? signer.version : 1,
            account: signer,
          }}
        />
      )}

      {open === 'addCredits' && (
        <AddCredits
          {...toFrom}
          open={open === 'addCredits'}
          onCancel={() => setOpen(null)}
          onFinish={(ok) => ok && setOpen(null)}
          signer={{
            signer: signer.url,
            signerVersion: signer instanceof KeyPage ? signer.version : 1,
            account: signer,
          }}
        />
      )}
    </>
  );
}

async function getSigners(
  api: JsonRpcClient,
  web3: Context,
  acc: core.Account,
) {
  const authorities = await resolveAuthorities(api, acc);
  if (!authorities) {
    return;
  }

  const ethKeyHash = web3.publicKey.ethereum.replace(/^0x/, '').toLowerCase();
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
