import {
  Card,
  Progress,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiExternalLinkLine,
  RiShieldCheckLine,
  RiTrophyLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';

import getSupply from '../../utils/getSupply';
import { TokenAmount } from '../common/Amount';
import Count from '../common/Count';
import { InfiniteTable } from '../common/InfiniteList';
import { Network } from '../common/Network';

const { Title, Text } = Typography;

const Validators = () => {
  const { network } = useContext(Network);
  const [totalValidators, setTotalValidators] = useState(-1);
  const [supply, setSupply] = useState(null);
  const [sort, setSort] = useState({ field: 'totalStaked', order: 'desc' });

  const columns = [
    {
      title: 'Identity',
      sorter: true,
      dataIndex: 'identity',
      render: (identity) => {
        if (identity) {
          return (
            <div>
              <Link to={'/acc/' + identity.replace('acc://', '')}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiAccountCircleLine />
                </IconContext.Provider>
                {identity}
              </Link>
              {identity === 'acc://accumulate.acme' ? (
                <div className="name-tag">
                  <Tag>Accumulate Foundation</Tag>
                </div>
              ) : null}
            </div>
          );
        } else {
          return <Text disabled>N/A</Text>;
        }
      },
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (type) => {
        if (type) {
          return <Tag color="cyan">{type}</Tag>;
        } else {
          return <Text disabled>N/A</Text>;
        }
      },
    },
    {
      title: 'Self-stake',
      sorter: true,
      render: (row) => {
        return (
          <Tooltip overlayClassName="explorer-tooltip" title={row.stake}>
            <Link to={'/acc/' + row.stake.replace('acc://', '')}>
              <TokenAmount
                bare
                amount={row.balance}
                issuer="ACME"
                digits={{ max: 0, group: true }}
              />
            </Link>
          </Tooltip>
        );
      },
    },
    {
      title: 'Total staked',
      sorter: true,
      defaultSortOrder: 'descend',
      dataIndex: 'totalStaked',
      render: (totalStaked) => {
        if ((totalStaked || totalStaked === 0) && supply?.staked) {
          const pt = ((totalStaked / supply.staked) * 100).toFixed(2);
          return (
            <Text>
              <TokenAmount
                amount={totalStaked}
                issuer="ACME"
                digits={{ min: 0, max: 0, group: true }}
              />
              <br />
              <Progress
                percent={pt}
                strokeColor={'#1677ff'}
                showInfo={true}
                className="staking-progress"
              />
            </Text>
          );
        } else {
          return <Text disabled>N/A</Text>;
        }
      },
    },
    {
      title: 'Rewards',
      dataIndex: 'rewards',
      render: (rewards) => {
        return (
          <div>
            <Link to={'/acc/' + rewards.replace('acc://', '')}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiAccountCircleLine />
              </IconContext.Provider>
              {rewards}
            </Link>
          </div>
        );
      },
    },
  ];

  const loadPage = async (start, count) => {
    if (!network.metrics) throw new Error('Validator metrics endpoint not configured');
    try {
      const response = await axios.get(
        network.metrics +
          '/validators?start=' +
          start +
          '&count=' +
          count +
          '&sort=' +
          sort.field +
          '&order=' +
          sort.order,
      );
      if (!response || !response.data) throw new Error('Validators not found');
      if (typeof response.data.total === 'number') {
        setTotalValidators(response.data.total);
      }
      return response.data.result || [];
    } catch (error) {
      if (error.message) message.error(error.message);
      throw error;
    }
  };

  // Prime total on mount / sort change so InfiniteTable can render.
  useEffect(() => {
    document.title = 'Validators | Accumulate Explorer';
    getSupply(network, setSupply);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!network.metrics) return;
        const response = await axios.get(
          network.metrics +
            '/validators?start=0&count=1&sort=' +
            sort.field +
            '&order=' +
            sort.order,
        );
        if (cancelled) return;
        if (response?.data?.total != null) {
          setTotalValidators(response.data.total);
        }
      } catch (error) {
        if (error.message) message.error(error.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [network.id, sort.field, sort.order]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSort = (_pagination, _filters, sorter) => {
    let field = sorter?.field || 'totalStaked';
    if (sorter?.column?.title === 'Self-stake') field = 'balance';
    const order =
      sorter?.order === 'ascend'
        ? 'asc'
        : sorter?.order === 'descend'
          ? 'desc'
          : 'desc';
    if (field !== sort.field || order !== sort.order) {
      setSort({ field, order });
    }
  };

  return (
    <div>
      <Title level={2}>Validators</Title>

      <Card className="staking-card" style={{ marginBottom: 20 }}>
        <Tabs
          defaultActiveKey="TabValidators"
          items={[
            {
              key: 'TabValidators',
              label: (
                <span>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiShieldCheckLine />
                  </IconContext.Provider>
                  About Validators
                </span>
              ),
              children: (
                <>
                  Validators are nodes that are responsible for verifying and
                  validating transactions and adding them to the blockchain.
                  <br />
                  In Accumulate validators earn <strong>10%</strong> of staking
                  rewards.
                </>
              ),
            },
            {
              key: 'TabBecomeValidator',
              label: (
                <span>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiTrophyLine />
                  </IconContext.Provider>
                  Become Validator
                </span>
              ),
              children: (
                <>
                  Anyone with a minimum stake of <strong>50,000 ACME</strong> can
                  become a validator.
                  <br />
                  <a
                    href="https://docs.accumulatenetwork.io/accumulate/setup/validator-node-setup-with-accman"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <strong>
                      Validator node setup
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

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiAccountCircleLine />
        </IconContext.Provider>
        Validators List
        {totalValidators > 0 ? <Count count={totalValidators} /> : null}
      </Title>

      {totalValidators >= 0 && (
        <InfiniteTable
          key={`${sort.field}:${sort.order}`}
          className="validators-table"
          total={totalValidators}
          loadPage={loadPage}
          columns={columns}
          rowKey={(row, idx) => row?.entryHash || row?.identity || `v-${idx}`}
          onSort={onSort}
          sortDirections={['ascend', 'descend', 'ascend']}
          cursorParam="validators_start"
          cursorOf={(row) => row?.identity}
        />
      )}
    </div>
  );
};

export default Validators;
