import {
  Card,
  Descriptions,
  Progress,
  Skeleton,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiExternalLinkLine,
  RiInformationLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';

import Count from '../common/Count';
import { InfoTable } from '../common/InfoTable';
import { Network } from '../common/Network';

const { Title, Text } = Typography;

const STAKING_SUMMARY_URL =
  'https://staking.accumulatenetwork.io/api/explorer/staking-summary';

const fmtAcme = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const pct = (num, denom) => {
  const n = Number(num);
  const d = Number(denom);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return 0;
  return Math.round((n / d) * 100);
};

const Staking = () => {
  const { network } = useContext(Network);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [stakingRewardRate, setStakingRewardRate] = useState(0);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await axios.get(STAKING_SUMMARY_URL);
      setSummary(response?.data || null);
    } catch (error) {
      console.warn('Staking summary fetch failed:', error.message);
      setSummary(null);
    }
    setSummaryLoading(false);
  };

  const fetchLiquidStakingInfo = async () => {
    try {
      const response = await axios.get(
        'https://api.accumulated.finance/v1/lsd/wacme',
      );
      setStakingRewardRate(
        Math.max(Number(response.data[0]?.apr), Number(response.data[1]?.apr)),
      );
    } catch (error) {
      console.warn('Liquid staking APR fetch failed:', error.message);
    }
  };

  useEffect(() => {
    document.title = 'Staking | Accumulate Explorer';
    if (network.mainnet) {
      fetchSummary();
    }
    fetchLiquidStakingInfo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const supply = summary?.supply;
  const stakers = summary?.stakers || [];

  const columns = [
    {
      title: 'Account',
      dataIndex: 'account',
      sorter: (a, b) => (a.account || '').localeCompare(b.account || ''),
      render: (account, row) => {
        if (!account) return <Text disabled>N/A</Text>;
        const href = account.replace(/^acc:\/\//, '');
        return (
          <div>
            <Link to={'/acc/' + href}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiAccountCircleLine />
              </IconContext.Provider>
              {account}
            </Link>
            {row.identity === 'accumulate.acme' ? (
              <div className="name-tag">
                <Tag>Accumulate Foundation</Tag>
              </div>
            ) : null}
            {row.identity === 'accumulated.acme' ? (
              <div className="name-tag">
                <Tag>Liquid Staking</Tag>
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: 'Type',
      dataIndex: 'type',
      sorter: (a, b) => (a.type || '').localeCompare(b.type || ''),
      render: (type) =>
        type ? <Tag>{type}</Tag> : <Text disabled>N/A</Text>,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      defaultSortOrder: 'descend',
      sorter: (a, b) => Number(a.balance) - Number(b.balance),
      render: (balance) => {
        const n = Number(balance);
        if (!Number.isFinite(n)) return <Text disabled>N/A</Text>;
        return <span>{fmtAcme(n)} ACME</span>;
      },
    },
    {
      title: 'Rewards',
      dataIndex: 'rewards',
      sorter: (a, b) => Number(a.rewards) - Number(b.rewards),
      render: (rewards) => {
        const n = Number(rewards);
        if (!Number.isFinite(n)) return <Text disabled>N/A</Text>;
        return (
          <span>
            {n.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}{' '}
            ACME
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <Title level={2}>Staking</Title>

      <Card className="staking-card" style={{ marginBottom: 20 }}>
        <Tabs
          defaultActiveKey="TabStaking"
          items={[
            {
              key: 'TabStaking',
              label: <span>ACME Staking</span>,
              children: (
                <>
                  You can stake ACME following{' '}
                  <a
                    href="https://docs.accumulatenetwork.io/accumulate/staking/how-to-stake-your-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <strong>
                      this guide
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <RiExternalLinkLine />
                      </IconContext.Provider>
                    </strong>
                  </a>
                </>
              ),
            },
            {
              key: 'TabLiquidStaking',
              label: (
                <span>
                  WACME Liquid Staking
                  {stakingRewardRate > 0 ? (
                    <Tag
                      color="green"
                      style={{ marginLeft: 10, marginRight: 0 }}
                    >
                      APR: {stakingRewardRate.toFixed(2)}%
                    </Tag>
                  ) : null}
                </span>
              ),
              children: (
                <>
                  You can stake WACME in the liquid staking on{' '}
                  <a
                    href="https://accumulated.finance/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <strong>
                      Accumulated Finance
                      <IconContext.Provider
                        value={{ className: 'react-icons react-icons-end' }}
                      >
                        <RiExternalLinkLine />
                      </IconContext.Provider>
                    </strong>
                  </a>
                </>
              ),
            },
          ]}
        />
      </Card>

      {network.mainnet && (
        <>
          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            ACME Supply
          </Title>

          {supply ? (
            <InfoTable>
              <Descriptions.Item label="Max supply">
                {fmtAcme(supply.maxSupply)} ACME
              </Descriptions.Item>
              <Descriptions.Item label="Issued">
                {fmtAcme(supply.issued)} ACME
                <Progress
                  percent={pct(supply.issued, supply.maxSupply)}
                  strokeColor={'#1677ff'}
                  showInfo={false}
                />
                <Text type="secondary">
                  {pct(supply.issued, supply.maxSupply)}% of max supply is
                  issued
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Unissued">
                {fmtAcme(supply.unissued)} ACME
              </Descriptions.Item>
              <Descriptions.Item label="Staked">
                {fmtAcme(supply.staked)} ACME
                <Progress
                  percent={pct(supply.issued, supply.maxSupply)}
                  success={{
                    percent: pct(supply.staked, supply.maxSupply),
                    strokeColor: '#1677ff',
                  }}
                  strokeColor={'#d6e4ff'}
                  showInfo={false}
                />
                <Text type="secondary">
                  {pct(supply.staked, supply.issued)}% of issued supply is
                  staked
                </Text>
              </Descriptions.Item>
            </InfoTable>
          ) : (
            <div className="skeleton-holder">
              <Skeleton active />
            </div>
          )}

          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiAccountCircleLine />
            </IconContext.Provider>
            Stakers
            {stakers.length ? <Count count={stakers.length} /> : null}
          </Title>

          <Table
            dataSource={stakers}
            columns={columns}
            rowKey={(row) => row.account || row.identity}
            pagination={false}
            loading={summaryLoading}
            scroll={{ x: 'max-content', y: 500 }}
            sortDirections={['descend', 'ascend', 'descend']}
          />
        </>
      )}
    </div>
  );
};

export default Staking;
