import { Descriptions, List, Table, Tag, Tooltip, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiFileList2Line,
  RiInformationLine,
  RiKeynoteLine,
  RiQuestionLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';

import { AccChains } from '../../common/AccChains';
import Authorities from '../../common/Authorities';
import Count from '../../common/Count';
import Data from '../../common/Data';
import ExtId from '../../common/ExtId';
import RPC from '../../common/RPC';
import tooltipDescs from '../../common/TooltipDescriptions';

const { Title, Paragraph, Text } = Typography;

const DataAccount = (props) => {
  const account = props.data;
  account.type = account.account.type;
  account.data = account.account;

  const [entries, setEntries] = useState(null);
  const [tableIsLoading, setTableIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ['2', '10', '20', '50', '100'],
    current: 1,
  });
  const [totalEntries, setTotalEntries] = useState(-1);

  const getEntries = async (params = pagination) => {
    setTableIsLoading(true);

    let start = 0;
    let showTotalStart = 1;
    let showTotalFinish = 10;

    if (params) {
      start = (params.current - 1) * params.pageSize;
      showTotalStart = (params.current - 1) * params.pageSize + 1;
      showTotalFinish = params.current * params.pageSize;
    }

    try {
      const response = await RPC.request(
        'query',
        {
          scope: account.data.url,
          query: {
            queryType: 'data',
            range: { count: params.pageSize, start },
          },
        },
        'v3',
      );
      if (response?.records) {
        // workaround API bug response
        if (response.start === null || response.start === undefined) {
          response.start = 0;
        }
        setEntries(response.records);
        setPagination({
          ...pagination,
          current: response.start / response.records.length + 1,
          pageSize: response.records.length,
          total: response.total,
          showTotal: (total, range) =>
            `${showTotalStart}-${Math.min(response.total, showTotalFinish)} of ${response.total}`,
        });
        setTotalEntries(response.total);
      } else {
        throw new Error('Data set not found');
      }
    } catch (error) {
      // error is managed by RPC.js, no need to display anything
    }
    setTableIsLoading(false);
  };

  const columns = [
    {
      title: 'Entry Hash',
      dataIndex: 'entry',
      className: 'code',
      render: (entry) => (
        <Link to={'#data/' + entry}>
          <IconContext.Provider value={{ className: 'react-icons' }}>
            <RiFileList2Line />
          </IconContext.Provider>
          {entry}
        </Link>
      ),
    },
    {
      title: 'Entry Data',
      render: (entry) => {
        const data = entry?.value?.message?.transaction?.body?.entry?.data;
        if (data?.length > 0) {
          var items = [];
          if (Array.isArray(data)) {
            items = data.slice(0, 3).map((item, index) => (
              <ExtId compact key={index}>
                {item ? item : ''}
              </ExtId>
            ));
            let extra = data.length - 3;
            if (extra > 0) {
              items.push(
                <Tag className="extid-tag" index="extra">
                  +{extra} more
                </Tag>,
              );
            }
          } else {
            items.push(
              <ExtId compact key="data">
                {data ? data : ''}
              </ExtId>,
            );
          }
          return <nobr>{items}</nobr>;
        } else {
          return null;
        }
      },
    },
  ];

  useEffect(() => {
    getEntries();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <Descriptions bordered column={1} size="middle">
        {account.type ? (
          <Descriptions.Item label="Type">{account.type}</Descriptions.Item>
        ) : null}
      </Descriptions>

      {account.data ? (
        <div>
          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Data Account Info
          </Title>

          <Descriptions bordered column={1} size="middle">
            {account.data.url ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.dataAccountUrl}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Data Account URL
                    </nobr>
                  </span>
                }
              >
                {account.data.url}
              </Descriptions.Item>
            ) : null}

            {account.adi ? (
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
                      ADI
                    </nobr>
                  </span>
                }
              >
                <Link to={'/acc/' + account.adi.replace('acc://', '')}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountCircleLine />
                  </IconContext.Provider>
                  {account.adi}
                </Link>
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          <Authorities items={account.data.authorities} />

          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiKeynoteLine />
            </IconContext.Provider>
            Data Account State
          </Title>

          {account.data.entry && account.data.entry.data ? (
            <List
              size="small"
              bordered
              dataSource={account.data.entry.data}
              renderItem={(item) => (
                <List.Item>
                  <Data>{item}</Data>
                </List.Item>
              )}
              style={{ marginBottom: '30px' }}
            />
          ) : (
            <Paragraph>
              <Text type="secondary">Empty state</Text>
            </Paragraph>
          )}

          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiFileList2Line />
            </IconContext.Provider>
            Data Entries
            <Count count={totalEntries ? totalEntries : 0} />
          </Title>

          <Table
            dataSource={entries}
            columns={columns}
            pagination={totalEntries > pagination.pageSize && pagination}
            rowKey="entry"
            loading={tableIsLoading}
            onChange={getEntries}
            scroll={{ x: 'max-content' }}
          />

          <AccChains account={account.data.url} />
        </div>
      ) : null}
    </div>
  );
};

export default DataAccount;
