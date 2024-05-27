import {
  Descriptions,
  List,
  Spin,
  Table,
  TablePaginationConfig,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useContext, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiFileList2Line,
  RiInformationLine,
  RiKeynoteLine,
  RiQuestionLine,
} from 'react-icons/ri';
import { Link as DomLink } from 'react-router-dom';

import { URL } from 'accumulate.js';
import { ChainEntryRecord, MessageRecord } from 'accumulate.js/lib/api_v3';
import { FactomDataEntry, TransactionType } from 'accumulate.js/lib/core';
import { TransactionMessage } from 'accumulate.js/lib/messaging';

import { DataChain, DataTxn } from '../../../utils/DataChain';
import { AccChains } from '../../common/AccChains';
import Authorities from '../../common/Authorities';
import Count from '../../common/Count';
import Data from '../../common/Data';
import ExtId from '../../common/ExtId';
import { Link } from '../../common/Link';
import { Nobr } from '../../common/Nobr';
import { Shared } from '../../common/Shared';
import tooltipDescs from '../../common/TooltipDescriptions';
import { useAsyncEffect } from '../../common/useAsync';

const { Title, Paragraph, Text } = Typography;

type TxnEntry = ChainEntryRecord<MessageRecord<TransactionMessage>>;

const DataAccount = (props) => {
  const account = props.data;
  account.type = account.account.type;
  account.data = account.account;

  const { api } = useContext(Shared);
  if (!api) return <Spin />;

  const [dataChain] = useState(new DataChain(URL.parse(account.data.url), api));
  const [entries, setEntries] = useState<TxnEntry[]>(null);
  const [tableIsLoading, setTableIsLoading] = useState(true);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ['2', '10', '20', '50', '100'],
    current: 1,
    hideOnSinglePage: true,

    showTotal(_, range) {
      const { total } = dataChain;
      if (typeof total !== 'number') {
        return;
      }
      return `${range[0]}-${range[1]} of ${total}`;
    },
  });
  const [totalEntries, setTotalEntries] = useState(-1);

  useAsyncEffect(
    async (mounted) => {
      setTableIsLoading(true);
      const r = await dataChain.getRange({
        start: (pagination.current - 1) * pagination.pageSize,
        count: pagination.pageSize,
      });
      if (!mounted()) return;

      let total = r.total;
      if (typeof total !== 'number') {
        // Pretend that we have another page to make pagination work
        total = (pagination.current + 1) * pagination.pageSize;
      }

      setEntries(r.records);
      setPagination({ ...pagination, total });
      setTotalEntries(r.total);
      setTableIsLoading(false);
    },
    [account.data.url, JSON.stringify(pagination)],
  );

  const columns = [
    {
      title: 'ID',
      className: 'code',
      render: (entry: TxnEntry) => (
        <Link to={entry.value.id}>
          <IconContext.Provider value={{ className: 'react-icons' }}>
            <RiFileList2Line />
          </IconContext.Provider>
          {Buffer.from(entry.entry).toString('hex')}
        </Link>
      ),
    },
    {
      title: 'Entry Data',
      render: (entry: TxnEntry) => {
        const body = entry.value.message.transaction.body as DataTxn;
        const data =
          body.entry instanceof FactomDataEntry
            ? [body.entry.data, ...body.entry.extIds]
            : body.entry.data;
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
                <Tag className="extid-tag" key="extra">
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
          return <Nobr>{items}</Nobr>;
        } else {
          return null;
        }
      },
    },
  ];

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
                    <Nobr>
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
                    </Nobr>
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
                    <Nobr>
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
                    </Nobr>
                  </span>
                }
              >
                <DomLink to={'/acc/' + account.adi.replace('acc://', '')}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountCircleLine />
                  </IconContext.Provider>
                  {account.adi}
                </DomLink>
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
            {(totalEntries || totalEntries == 0) && (
              <Count count={totalEntries} />
            )}
          </Title>

          <Table
            dataSource={entries}
            columns={columns}
            pagination={pagination}
            rowKey="entry"
            loading={tableIsLoading}
            onChange={(p) => setPagination(p)}
            scroll={{ x: 'max-content' }}
          />

          <AccChains account={account.data.url} />
        </div>
      ) : null}
    </div>
  );
};

export default DataAccount;
