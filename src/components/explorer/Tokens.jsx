import { Avatar, Table, Typography, message } from 'antd';
import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiEarthLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';

import Count from '../common/Count';
import { Shared } from '../common/Network';

const { Title, Paragraph, Text } = Typography;

const Tokens = () => {
  const { network } = useContext(Shared);
  const [tokens, setTokens] = useState(null);
  const [totalTokens, setTotalTokens] = useState(-1);
  const [tableIsLoading, setTableIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    current: 1,
  });

  //const { loading, error, data } = useQuery(GET_TOKENS);

  const getTokens = async (params = pagination, filters) => {
    setTableIsLoading(true);

    let start = 0;
    let count = 10;
    let showTotalStart = 1;
    let showTotalFinish = 10;

    if (params) {
      start = (params.current - 1) * params.pageSize;
      count = params.pageSize;
      showTotalStart = (params.current - 1) * params.pageSize + 1;
      showTotalFinish = params.current * params.pageSize;
    }

    try {
      if (!network.metrics) throw new Error();
      const response = await axios.get(
        network.metrics + '/tokens?start=' + start + '&count=' + count,
      );
      if (response && response.data) {
        /* workaround API bug response
                if (response.data.start === null || response.data.start === undefined) {
                    response.data.start = 0;
                } */

        setTokens(response.data.result);
        setPagination({
          ...pagination,
          current: response.data.start / response.data.count + 1,
          pageSize: response.data.count,
          total: response.data.total,
          showTotal: (total, range) =>
            `${showTotalStart}-${Math.min(response.data.total, showTotalFinish)} of ${response.data.total}`,
        });
        setTotalTokens(response.data.total);
      } else {
        throw new Error('Tokens not found');
      }
    } catch (error) {
      setTokens(null);
      setTotalTokens(-1);
      if (error.message) message.error(error.message);
    }
    setTableIsLoading(false);
  };

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

  useEffect(() => {
    document.title = 'Tokens | Accumulate Explorer';
    getTokens();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <Title level={2}>
        Tokens
        {totalTokens ? <Count count={totalTokens} /> : null}
      </Title>

      {tokens && (
        <Table
          dataSource={tokens}
          columns={columns}
          pagination={pagination}
          showHeader={false}
          loading={tableIsLoading}
          rowKey={() => Date.now()}
          scroll={{ x: 'max-content' }}
        />
      )}
    </div>
  );
};

export default Tokens;
