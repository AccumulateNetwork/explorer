import { SendOutlined } from '@ant-design/icons';
import { Dropdown, DropdownProps, Typography } from 'antd';
import { MenuItemType } from 'antd/lib/menu/hooks/useItems';
import React, { useContext, useEffect, useState } from 'react';

import { URL, core } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import {
  AccountType,
  KeyPage,
  KeySpec,
  LiteIdentity,
} from 'accumulate.js/lib/core';
import { open } from 'accumulate.js/lib/ledger/hw';

import { Network } from '../common/Network';
import { queryEffect } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { AddCredits } from '../form/AddCredits';
import { CreateIdentity } from '../form/CreateIdentity';
import { SendTokens } from '../form/SendTokens';
import { getSigners } from '../form/utils';
import { useWeb3 } from './Context';

const { Text } = Typography;

interface Signer {
  signer: KeyPage | LiteIdentity;
  entry: KeySpec;
}

interface ToFrom {
  to?: URL;
  from?: URL;
}

export function Actions({ account: accountUrl }: { account: URL }) {
  type FormKey = 'addCredits' | 'sendTokens' | 'createIdentity';
  const web3 = useWeb3();
  const [acc, setAcc] = useState<core.Account>();
  const [signers, setSigners] = useState<Signer[]>([]);
  const [items, setItems] = useState<DropdownProps['menu']['items']>([]);
  const [toFrom, setToFrom] = useState<ToFrom>({});
  const [open, setOpen] = useState<FormKey>();

  queryEffect(accountUrl).then((r) => {
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
          item({ label: 'Receive tokens', open: 'sendTokens', to: acc.url }),
          item({
            label: 'Purchase credits',
            open: 'addCredits',
            from: acc.url,
          }),
        ]);
        break;

      case AccountType.LiteIdentity:
        setItems([
          item({
            label: 'Purchase credits',
            open: 'addCredits',
            to: acc.url,
          }),
          item({
            label: 'Create an ADI',
            open: 'createIdentity',
          }),
        ]);
        break;

      case AccountType.KeyPage:
        setItems([
          item({
            label: 'Purchase credits',
            open: 'addCredits',
            to: acc.url,
          }),
        ]);
        break;
    }
  }, [acc]);

  const { api } = useContext(Network);
  useAsyncEffect(
    async (mounted) => {
      setSigners([]);
      if (!web3?.linked || !acc) {
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
      <Dropdown
        className="web3-actions"
        menu={{ items }}
        placement="bottomRight"
      >
        <SendOutlined
          style={{
            cursor: 'pointer',
            color: 'hsl(40, 100%, 47.5%)',
            // transform: 'rotate(-30deg)',
          }}
        />
      </Dropdown>

      {/* Modals */}
      {open === 'sendTokens' && (
        <SendTokens
          {...toFrom}
          open={open === 'sendTokens'}
          onCancel={() => setOpen(null)}
          onFinish={(ok) => ok && setOpen(null)}
          signer={
            toFrom.from?.equals(acc.url) && {
              signer: signer.url,
              signerVersion: signer instanceof KeyPage ? signer.version : 1,
              account: signer,
            }
          }
        />
      )}

      {open === 'addCredits' && (
        <AddCredits
          {...toFrom}
          open={open === 'addCredits'}
          onCancel={() => setOpen(null)}
          onFinish={(ok) => ok && setOpen(null)}
          signer={
            toFrom.from?.equals(acc.url) && {
              signer: signer.url,
              signerVersion: signer instanceof KeyPage ? signer.version : 1,
              account: signer,
            }
          }
        />
      )}

      {open === 'createIdentity' && (
        <CreateIdentity
          open={open === 'createIdentity'}
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
