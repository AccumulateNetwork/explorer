import { Card, Col, Row, Skeleton, Tag, Typography, message } from 'antd';
import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiCoinLine,
  RiDiscordFill,
  RiHandCoinLine,
  RiMoneyDollarCircleLine,
  RiRedditFill,
  RiStarLine,
  RiTelegramFill,
  RiTwitterFill,
  RiUserSmileLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';

import { Network } from '../common/Network';
import { loadFavourites } from './../common/Favourites';
import MinorBlocks from './../common/MinorBlocks';

const { Title, Text } = Typography;

const Blocks = () => {
  const favourites = loadFavourites();
  const [price, setPrice] = useState(null);
  const [isMainnet, setIsMainnet] = useState(false);

  const getPrice = async () => {
    setPrice(null);

    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/coins/wrapped-accumulate',
      );
      if (
        response &&
        response.data.market_data &&
        response.data.market_data.current_price &&
        response.data.market_data.current_price.usd
      ) {
        setPrice(response.data.market_data.current_price.usd);
      } else {
        throw new Error('Coingecko API is not available');
      }
    } catch (error) {
      setPrice(null);
      message.error(error.message);
    }
  };

  const { network } = useContext(Network);
  useEffect(() => {
    document.title = 'Blocks | Accumulate Explorer';
    if (network.mainnet) {
      setIsMainnet(true);
      getPrice();
    }
  }, []);

  return (
    <div>
      <Title level={2}>Accumulate Explorer</Title>

      <div className="stats" style={{ marginTop: 5, marginBottom: 20 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8} md={6} lg={5} xl={4}>
            <Link to="/acc/acme">
              <Card>
                <span>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiCoinLine />
                  </IconContext.Provider>
                  <br />
                  Accumulate token
                </span>
                <Title level={4}>ACME</Title>
              </Card>
            </Link>
          </Col>
          {isMainnet && (
            <Col xs={24} sm={8} md={6} lg={5} xl={4}>
              <a
                href="https://www.coingecko.com/en/coins/wrapped-accumulate"
                rel="noreferrer"
                target="_blank"
              >
                <Card>
                  <span>
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                      <RiMoneyDollarCircleLine />
                    </IconContext.Provider>
                    <br />
                    ACME price
                  </span>
                  <Title level={4}>
                    {price ? (
                      <Text>${price.toFixed(4)}</Text>
                    ) : (
                      <Skeleton active title={true} paragraph={false} />
                    )}
                  </Title>
                </Card>
              </a>
            </Col>
          )}
          {!isMainnet && (
            <Col xs={24} sm={8} md={6} lg={5} xl={4}>
              <Link to="/faucet">
                <Card>
                  <span>
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                      <RiHandCoinLine />
                    </IconContext.Provider>
                    <br />
                    Get test ACME
                  </span>
                  <Title level={4}>Faucet</Title>
                </Card>
              </Link>
            </Col>
          )}
          <Col xs={24} sm={8} md={6} lg={5} xl={4}>
            <Link to="/favourites">
              <Card>
                <span>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiStarLine />
                  </IconContext.Provider>
                  <br />
                  Favourites
                </span>
                <Title level={4}>{favourites.length}</Title>
              </Card>
            </Link>
          </Col>
          <Col xs={24} sm={16} md={12} lg={10} xl={8}>
            <Card>
              <span>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiUserSmileLine />
                </IconContext.Provider>
                <br />
                Join community
              </span>
              <div className="social">
                <a
                  href="https://twitter.com/accumulatehq"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Tag color="#55acee">
                    <IconContext.Provider
                      value={{ className: 'react-icons-social' }}
                    >
                      <RiTwitterFill />
                    </IconContext.Provider>
                    Twitter
                  </Tag>
                </a>
                <a
                  href="https://t.me/accumulatenetwork"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Tag color="#229ED9">
                    <IconContext.Provider
                      value={{ className: 'react-icons-social' }}
                    >
                      <RiTelegramFill />
                    </IconContext.Provider>
                    Telegram
                  </Tag>
                </a>
                <a
                  href="https://discord.gg/AySYNywCqZ"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Tag color="#7289da">
                    <IconContext.Provider
                      value={{ className: 'react-icons-social' }}
                    >
                      <RiDiscordFill />
                    </IconContext.Provider>
                    Discord
                  </Tag>
                </a>
                <a
                  href="https://reddit.com/r/Accumulate"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Tag color="#FF4500">
                    <IconContext.Provider
                      value={{ className: 'react-icons-social' }}
                    >
                      <RiRedditFill />
                    </IconContext.Provider>
                    Reddit
                  </Tag>
                </a>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <MinorBlocks url="acc://dn.acme" />
    </div>
  );
};

export default Blocks;
