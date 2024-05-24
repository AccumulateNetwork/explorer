import { Descriptions, Skeleton, Table, Tooltip, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiExchangeLine,
  RiFolder2Line,
  RiInformationLine,
  RiQuestionLine,
  RiShieldCheckLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';

import Authorities from '../../common/Authorities';
import Count from '../../common/Count';
import RPC from '../../common/RPC';
import tooltipDescs from '../../common/TooltipDescriptions';
import TxChain from '../../common/TxChain';

const { Title, Text } = Typography;

const ADI = (props) => {
  let type = props.type ? props.type : 'ADI';
  const adi = props.data;
  const [directory, setDirectory] = useState(null);
  const [totalDirectory, setTotalDirectory] = useState(-1);
  const [tableIsLoading, setTableIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    current: 1,
  });

  const columns = [
    {
      title: 'Accounts',
      render: (row) => {
        if (row?.value) {
          return (
            <Link to={'/acc/' + row.value.replace('acc://', '')}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiFolder2Line />
              </IconContext.Provider>
              {row.value}
            </Link>
          );
        } else {
          return <Text disabled>N/A</Text>;
        }
      },
    },
  ];

  const getDirectory = async (params = pagination) => {
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
      const response = await RPC.request(
        'query',
        {
          scope: adi.account.url,
          query: {
            queryType: 'directory',
            range: { start: start, count: count },
          },
        },
        'v3',
      );
      if (response && response.records) {
        // workaround API bug response
        if (response.start === null || response.start === undefined) {
          response.start = 0;
        }

        setDirectory(response.records);
        setPagination({
          ...pagination,
          current: response.start / count + 1,
          pageSize: count,
          total: response.total,
          showTotal: (total, range) =>
            `${showTotalStart}-${Math.min(response.total, showTotalFinish)} of ${response.total}`,
        });
        setTotalDirectory(response.total);
      } else {
        throw new Error('ADI Directory not found');
      }
    } catch (error) {
      // error is managed by RPC.js, no need to display anything
    }
    setTableIsLoading(false);
  };

  useEffect(() => {
    getDirectory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <Descriptions bordered column={1} size="middle">
        {adi.recordType ? (
          <Descriptions.Item label="Type">{adi.recordType}</Descriptions.Item>
        ) : null}
      </Descriptions>

      {adi.account ? (
        <div>
          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            {type} Info
          </Title>
          <Descriptions bordered column={1} size="middle">
            {adi.account.url ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.adiUrl}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      URL
                    </nobr>
                  </span>
                }
              >
                {adi.account.url}
              </Descriptions.Item>
            ) : null}

            {adi.recordType === 'liteIdentity' && (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.creditBalance}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Credit Balance
                    </nobr>
                  </span>
                }
              >
                {adi.account.creditBalance
                  ? adi.account.creditBalance / 100
                  : 0}
                 credits
              </Descriptions.Item>
            )}
          </Descriptions>

          <Authorities items={adi.account.authorities} />

          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiFolder2Line />
            </IconContext.Provider>
            {type} Directory
            <Count count={totalDirectory ? totalDirectory : 0} />
          </Title>

          <Table
            dataSource={directory}
            columns={columns}
            pagination={pagination}
            rowKey="txid"
            loading={tableIsLoading}
            onChange={getDirectory}
            scroll={{ x: 'max-content' }}
          />

          <TxChain url={adi.account.url} type="transaction" />
          <TxChain url={adi.account.url} type="signature" />
        </div>
      ) : (
        <div>
          <div>
            <Title level={4}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiInformationLine />
              </IconContext.Provider>
              {type} Info
            </Title>
            <div className="skeleton-holder">
              <Skeleton active />
            </div>
            <Title level={4}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiFolder2Line />
              </IconContext.Provider>
              {type} Directory
            </Title>
            <Title level={4}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiExchangeLine />
              </IconContext.Provider>
              Transactions
            </Title>
            <Title level={4}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiShieldCheckLine />
              </IconContext.Provider>
              Signature Chain
            </Title>
            <div className="skeleton-holder">
              <Skeleton active />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ADI;
