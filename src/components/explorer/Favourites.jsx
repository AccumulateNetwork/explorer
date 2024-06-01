import { List, Rate, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiAccountCircleLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';

import Count from '../common/Count';
import {
  addFavourite,
  isFavourite,
  removeFavourite,
} from '../common/Favourites';
import { Settings } from './Settings';

const { Title } = Typography;

const Favourites = () => {
  const [favourites, setFavourites] = useState(
    Settings.favourites.map((address) => {
      return { address, star: true };
    }),
  );

  useEffect(() => {
    document.title = 'Favourites | Accumulate Explorer';
  }, []);

  const handleFavChange = (address) => {
    if (isFavourite(address)) {
      removeFavourite(address);
    } else {
      addFavourite(address);
    }

    setFavourites(
      favourites.map((item) => {
        if (item.address === address) {
          return { ...item, star: !item.star };
        }
        return item;
      }),
    );
  };

  return (
    <div>
      <Title level={2}>
        Favourites
        {favourites ? <Count count={favourites.length} /> : null}
      </Title>

      <List
        bordered
        dataSource={favourites}
        renderItem={(favourite) => (
          <List.Item>
            <div>
              <Rate
                className={'acc-fav'}
                count={1}
                value={favourite.star}
                onChange={(e) => {
                  handleFavChange(favourite.address);
                }}
              />
              <Link to={'/acc/' + favourite.address.replace('acc://', '')}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiAccountCircleLine />
                </IconContext.Provider>
                {favourite.address}
              </Link>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
};

export default Favourites;
