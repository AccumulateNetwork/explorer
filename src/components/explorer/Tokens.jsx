import { Alert, Input, Table, Typography } from 'antd';
import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  SEARCH_PAGE_SIZE,
  formatSupply,
  searchError,
  searchTokensUrl,
  topTokensUrl,
} from '../../utils/tokenRegistry';
import Count from '../common/Count';
import { Network } from '../common/Network';

const { Title, Text, Paragraph } = Typography;

// The registry is built from the chain (#88): every token issuer, seeded
// offline from the partition databases and followed online. There are no
// logos, names or websites any more — the chain has none.

const accPath = (url) => '/acc/' + url.replace(/^acc:\/\//, '');

const columns = (ranked) => [
  ...(ranked
    ? [{ title: '#', width: 48, render: (_, __, i) => <Text>{i + 1}</Text> }]
    : []),
  {
    title: 'Token',
    render: (row) => (
      <Paragraph style={{ marginBottom: 0 }}>
        <Link to={accPath(row.url)}>
          <strong>{row.symbol}</strong>
        </Link>
        <br />
        <Text type="secondary" className="code">
          {row.url}
        </Text>
      </Paragraph>
    ),
  },
  {
    title: 'Supply',
    align: 'right',
    render: (row) => <Text className="code">{formatSupply(row.supply)}</Text>,
  },
  {
    title: 'Max supply',
    align: 'right',
    responsive: ['md'],
    render: (row) =>
      row.maxSupply ? (
        <Text className="code">{formatSupply(row.maxSupply)}</Text>
      ) : (
        <Text type="secondary">—</Text>
      ),
  },
];

const Tokens = () => {
  const { network } = useContext(Network);
  const [top, setTop] = useState(null);
  const [total, setTotal] = useState(-1);
  const [topError, setTopError] = useState(null);

  const [pattern, setPattern] = useState('');
  const [results, setResults] = useState(null);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState(null);

  useEffect(() => {
    document.title = 'Tokens | Accumulate Explorer';
    if (!network.metrics) return;
    let cancelled = false;
    setTop(null);
    setTopError(null);
    axios
      .get(topTokensUrl(network.metrics))
      .then(({ data }) => {
        if (cancelled) return;
        setTop(data.result);
        setTotal(data.total);
      })
      .catch(
        () => !cancelled && setTopError('The token registry is unavailable.'),
      );
    return () => {
      cancelled = true;
    };
  }, [network.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = async (value, pageNo = 1) => {
    const q = value.trim();
    setPattern(q);
    setPage(pageNo);
    setSearchErr(null);
    if (!q) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      const start = (pageNo - 1) * SEARCH_PAGE_SIZE;
      const { data } = await axios.get(
        searchTokensUrl(network.metrics, q, start),
      );
      setResults(data);
    } catch (error) {
      // Shown inline: a bad pattern is a typo to fix, not an outage.
      setResults(null);
      setSearchErr(searchError(error));
    } finally {
      setSearching(false);
    }
  };

  if (!network.metrics) {
    return (
      <div>
        <Title level={2}>Tokens</Title>
        <Alert type="info" message="This network has no token registry." />
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>
        Tokens
        {total > 0 ? <Count count={total} /> : null}
      </Title>

      <Input.Search
        allowClear
        placeholder="Search symbols and issuer URLs by regular expression, e.g. ^acme$ or pegnet\.acme/"
        enterButton="Search"
        loading={searching}
        onSearch={(v) => search(v)}
        style={{ marginBottom: 12 }}
      />
      {searchErr ? (
        <Alert
          type="error"
          showIcon
          message={searchErr}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {results ? (
        <>
          <Title level={4}>
            Matching <span className="code">/{pattern}/i</span>
            <Count count={results.total} />
          </Title>
          <Table
            className="tokens-table"
            columns={columns(false)}
            dataSource={results.result}
            rowKey="url"
            loading={searching}
            pagination={{
              current: page,
              pageSize: SEARCH_PAGE_SIZE,
              total: results.total,
              showSizeChanger: false,
              hideOnSinglePage: true,
              onChange: (p) => search(pattern, p),
            }}
          />
        </>
      ) : (
        <>
          <Title level={4}>Greatest supply</Title>
          {topError ? (
            <Alert type="warning" showIcon message={topError} />
          ) : (
            <Table
              className="tokens-table"
              columns={columns(true)}
              dataSource={top || []}
              rowKey="url"
              loading={top === null}
              pagination={false}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Tokens;
