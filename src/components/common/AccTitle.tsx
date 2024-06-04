import { Rate, Typography } from 'antd';
import React, { useEffect, useState } from 'react';

import { TxID, URL } from 'accumulate.js';

import { Actions } from '../web3/Actions';
import { addFavourite, isFavourite, removeFavourite } from './Favourites';

const { Title } = Typography;

export function AccTitle({
  title,
  url,
}: {
  title: React.ReactNode;
  url: URL | TxID;
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
        {title}
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
