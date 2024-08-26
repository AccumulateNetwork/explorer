import { LinkOutlined } from '@ant-design/icons';
import { Rate, Tooltip, Typography } from 'antd';
import React, { lazy, useEffect, useState } from 'react';

import { TxID, URL } from 'accumulate.js';
import { Account, AccountType } from 'accumulate.js/lib/core';

import tooltip from '../../utils/lang';
import { Sign } from '../form/Sign';
import { Actions as Web3Actions } from '../web3/Actions';
import { useWeb3 } from '../web3/Context';
import { addFavourite, isFavourite, removeFavourite } from './Favourites';
import { useShared } from './Shared';

const { Title } = Typography;

export function AccTitle({
  title,
  url,
  linkable,
}: {
  title: React.ReactNode;
  url: URL | TxID;
  linkable?: Account;
}) {
  if (url instanceof TxID) {
    url = url.asUrl();
  }

  const [isFav, setIsFav] = useState<boolean>(isFavourite(`${url}`));

  const handleFavChange = (e) => {
    if (e === 0) {
      removeFavourite(`${url}`);
      setIsFav(false);
    } else {
      addFavourite(`${url}`);
      setIsFav(true);
    }
  };

  return (
    <div>
      <Title level={2} key="main" className="accountTitle">
        {title}{' '}
        {linkable && (
          <span style={{ marginLeft: '10px' }}>
            <Link account={linkable} />
          </span>
        )}
        <span style={{ flex: 1 }} />
        {!url.username && <Web3Actions account={url} />}
      </Title>
      <Title
        level={4}
        key="sub"
        type="secondary"
        style={{ marginTop: '-10px' }}
        copyable={{ text: url.toString() }}
      >
        {!url.username && (
          <Rate
            className={'acc-fav'}
            count={1}
            defaultValue={isFav ? 1 : 0}
            value={isFav ? 1 : 0}
            onChange={(e) => {
              handleFavChange(e);
            }}
          />
        )}

        {url.toString()}
      </Title>
    </div>
  );
}

function Link({ account }: { account: Account }) {
  const web3 = useWeb3();
  const [toSign, setToSign] = useState<Sign.Request>();
  const [linked] = useShared(web3, 'linked');

  const link = async () => {
    const ok = await web3.dataStore?.add((txn) => Sign.submit(setToSign, txn), {
      type: 'link',
      url: `${account.url}`,
      accountType: AccountType.getName(account.type) as any,
    });
    if (ok) {
      web3.reload({ dataStore: true });
    }
  };

  if (!web3?.connected) {
    return false;
  }

  if (!linked?.all?.some((x) => account.url.equals(x.url))) {
    return (
      <>
        <Tooltip overlayClassName="explorer-tooltip" title={tooltip.web3.link}>
          <LinkOutlined
            style={{ color: 'lightgray', cursor: 'pointer' }}
            onClick={link}
          />
        </Tooltip>

        <Sign title={`Linking ${account.url}`} request={toSign} />
      </>
    );
  }

  return (
    <Tooltip overlayClassName="explorer-tooltip" title={tooltip.web3.linked}>
      <LinkOutlined style={{ color: '#61b3ff' }} />
    </Tooltip>
  );
}
