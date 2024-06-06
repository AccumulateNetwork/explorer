import { LinkOutlined } from '@ant-design/icons';
import { Rate, Tooltip, Typography } from 'antd';
import React, { useContext, useEffect, useState } from 'react';

import { TxID, URL, URLArgs } from 'accumulate.js';
import { Account, AccountType } from 'accumulate.js/lib/core';

import tooltip from '../../utils/lang';
import { Sign } from '../forms/Sign';
import { Actions } from '../web3/Actions';
import { useWeb3 } from '../web3/useWeb3';
import { addFavourite, isFavourite, removeFavourite } from './Favourites';
import { Shared } from './Network';
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

  const [isFav, setIsFav] = useState<number | null>(null);

  useEffect(() => {
    isFavourite(url.toString()) ? setIsFav(1) : setIsFav(0);
  }, [url.toString()]);

  const handleFavChange = (e) => {
    if (e === 0) {
      removeFavourite(url.toString());
    } else {
      addFavourite(url.toString());
    }
  };

  return (
    <div>
      <Title level={2} key="main">
        {title} {linkable && <Link account={linkable} />}
        {!url.username && <Actions account={url} />}
      </Title>
      <Title
        level={4}
        key="sub"
        type="secondary"
        style={{ marginTop: '-10px' }}
        copyable={{ text: url.toString() }}
      >
        {!url.username && typeof isFav === 'number' && (
          <Rate
            className={'acc-fav'}
            count={1}
            defaultValue={isFav}
            value={isFav}
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
  const { api } = useContext(Shared);
  const [toSign, setToSign] = useState<Sign.Request>();
  const [linked] = useShared(web3, 'linked');

  const link = async () => {
    const ok = await web3.store.add((txn) => Sign.submit(setToSign, txn), {
      type: 'link',
      url: `${account.url}`,
      accountType: AccountType.getName(account.type) as any,
    });
    if (!ok) {
      return;
    }
    await web3.reload(api, 'entries', 'linked');
  };

  if (!web3) {
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
