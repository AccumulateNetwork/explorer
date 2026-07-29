import { Avatar, Typography, message } from 'antd';
import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiEarthLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';

import Count from '../common/Count';
import { InfiniteTable } from '../common/InfiniteList';
import { Network } from '../common/Network';

const { Title, Paragraph, Text } = Typography;

const Tokens = () => {
  const { network } = useContext(Network);
  const [totalTokens, setTotalTokens] = useState(-1);

  const columns = [
    {
      title: 'Logo',
      width: 30,
      render: (row) => (
        <Link to={'/acc/' + row.tokenIssuer.replace('acc://', '')}>
          <Avatar size={40} src={row.logo}>
            {row.symbol}
          </Avatar>
        </Link>
      ),
    },
    {
      title: 'Token',
      render: (row) => (
        <Paragraph>
          <Link to={'/acc/' + row.tokenIssuer.replace('acc://', '')}>
            {row.symbol}
          </Link>
          <br />
          <Text type="secondary">{row.tokenIssuer}</Text>
        </Paragraph>
      ),
    },
    {
      title: 'Name',
      render: (row) => <Text>{row.name}</Text>,
    },
    {
      title: 'URL',
      render: (row) => (
        <a href={row.url} target="_blank" rel="noopener noreferrer">
          <IconContext.Provider value={{ className: 'react-icons' }}>
            <RiEarthLine />
          </IconContext.Provider>
          {row.url}
        </a>
      ),
    },
  ];

  const loadPage = async (start, count) => {
    if (!network.metrics)
      throw new Error('Token metrics endpoint not configured');
    try {
      const response = await axios.get(
        network.metrics + '/tokens?start=' + start + '&count=' + count,
      );
      if (!response || !response.data) throw new Error('Tokens not found');
      if (typeof response.data.total === 'number') {
        setTotalTokens(response.data.total);
      }
      return response.data.result || [];
    } catch (error) {
      if (error.message) message.error(error.message);
      throw error;
    }
  };

  // Prime the total on mount so InfiniteTable can pick its rendering mode.
  useEffect(() => {
    document.title = 'Tokens | Accumulate Explorer';
    let cancelled = false;
    (async () => {
      try {
        if (!network.metrics) return;
        const response = await axios.get(
          network.metrics + '/tokens?start=0&count=1',
        );
        if (cancelled) return;
        if (response?.data?.total != null) {
          setTotalTokens(response.data.total);
        }
      } catch (error) {
        if (error.message) message.error(error.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [network.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <Title level={2}>
        Tokens
        {totalTokens > 0 ? <Count count={totalTokens} /> : null}
      </Title>

      {totalTokens >= 0 && (
        <InfiniteTable
          className="tokens-table"
          total={totalTokens}
          loadPage={loadPage}
          columns={columns}
          showHeader={false}
          rowKey={(row, idx) => row?.tokenIssuer || `t-${idx}`}
          cursorParam="tokens_start"
          cursorOf={(row) => row?.tokenIssuer}
        />
      )}
    </div>
  );
};

export default Tokens;
