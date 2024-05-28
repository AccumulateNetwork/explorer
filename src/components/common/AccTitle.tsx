import { Rate, Typography } from 'antd';
import React, { useEffect, useState } from 'react';

import { URL } from 'accumulate.js';

import { addFavourite, isFavourite, removeFavourite } from './Favourites';

const { Title } = Typography;

export function AccTitle({ title, url }: { title: string; url: URL }) {
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
      <Title level={2} className="break-all" key="main">
        {title}
      </Title>
      <Title
        level={4}
        key="sub"
        type="secondary"
        style={{ marginTop: '-10px' }}
        className="break-all"
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
