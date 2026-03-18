import { List, Skeleton, Typography } from 'antd';
import { PaginationConfig } from 'antd/lib/pagination';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiTimerLine } from 'react-icons/ri';

import { URL, URLArgs } from 'accumulate.js';
import {
  ErrorRecord,
  MessageRecord,
  RangeOptionsArgs,
} from 'accumulate.js/lib/api_v3';
import { Status } from 'accumulate.js/lib/errors';
import { TransactionMessage } from 'accumulate.js/lib/messaging';

import { ManagedRange } from '../../utils/ManagedRange';
import Count from '../common/Count';
import { Link } from '../common/Link';
import { Network } from '../common/Network';
import { useAsyncEffect } from '../common/useAsync';

type PendingRecord = MessageRecord<TransactionMessage> | ErrorRecord;

const { Text, Title } = Typography;

export function Pending(props: { url: URLArgs }) {
  const url = URL.parse(props.url);

  const { api, network } = useContext(Network);
  const [managed, setManaged] = useState<ManagedRange<PendingRecord>>(null);

  useEffect(() => {
    setManaged(
      new ManagedRange(
        async (range) => {
          const r = await api.query(url, {
            queryType: 'pending',
            range: {
              expand: true,
              ...range,
            } as RangeOptionsArgs & { expand: true },
          });

          // Make a batched request to fetch transaction statuses if they are not
          // known
          const missing = new Map<string, number>();
          r.records?.forEach((r, i) => !r.status && missing.set(`${r.id}`, i));
          const r2 = (await api.call(
            [...missing.values()].map((i) => ({
              method: 'query',
              params: { scope: `${r.records[i].id}` },
            })),
          )) as unknown[];
          for (const data of r2) {
            const entry = new MessageRecord(data as any);
            const i = missing.get(`${entry.id}`)!;
            r.records[i].status = entry.status;
          }

          return r;
        },

        // The protocol had a bug and there are still expired transactions sitting
        // around
        (entry) =>
          !entry.status ||
          (entry.status < 400 && entry.status !== Status.Delivered),
      ),
    );
  }, [`${props.url}`, network.id]);

  const [records, setRecords] = useState<PendingRecord[]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationConfig>({
    pageSize: 10,
    showSizeChanger: true,
    hideOnSinglePage: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    current: 1,
  });

  useAsyncEffect(
    async (mounted) => {
      setIsLoading(true);
      try {
        if (!managed) return;
        const response = await managed.getPage(pagination);
        if (!mounted()) return;

        setRecords(response.records || []);
        setPagination({
          ...pagination,
          total: response.total,
        });
      } finally {
        if (!mounted()) return;
        setIsLoading(false);
      }
    },
    [managed, JSON.stringify(pagination)],
  );

  if (!records) {
    return (
      <div className="skeleton-holder">
        <Skeleton active />
      </div>
    );
  }

  if (pagination.total === 0) {
    return false;
  }

  return (
    <>
      <Title level={4} style={{ marginTop: 30 }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiTimerLine />
        </IconContext.Provider>
        Pending
        {typeof pagination.total === 'number' && (
          <Count count={pagination.total} />
        )}
      </Title>
      <List
        size="small"
        bordered
        dataSource={records as PendingRecord[]}
        pagination={{
          ...pagination,
          onChange(current, pageSize) {
            setPagination({
              ...pagination,
              current,
              pageSize,
            });
          },
        }}
        loading={isLoading}
        renderItem={(item) => {
          if (item instanceof ErrorRecord) {
            return <Text style={{ color: 'red' }}>{item.value.message}</Text>;
          }
          return (
            <List.Item>
              <Link to={item.id}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiTimerLine />
                </IconContext.Provider>
                {item.id.toString()}
              </Link>
            </List.Item>
          );
        }}
        style={{ marginBottom: '30px' }}
      />
    </>
  );
}
