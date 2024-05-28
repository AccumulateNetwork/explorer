import { Table, TablePaginationConfig, Tag, Typography } from 'antd';
import React, { useContext, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiFileList2Line } from 'react-icons/ri';

import { URL } from 'accumulate.js';

import { DataChain } from '../../../utils/DataChain';
import { DataTxnEntry, TxnEntry, dataEntryParts } from '../../../utils/data';
import Count from '../../common/Count';
import ExtId from '../../common/ExtId';
import { Link } from '../../common/Link';
import { Nobr } from '../../common/Nobr';
import { Shared } from '../../common/Shared';
import { useAsyncEffect } from '../../common/useAsync';

const { Title } = Typography;

export function DataLedger({ scope }: { scope: URL }) {
  const columns = [
    {
      title: '#',
      render: (entry: DataTxnEntry) => <DataLedger.Index entry={entry} />,
    },
    {
      title: 'ID',
      className: 'code',
      render: (entry: DataTxnEntry) => <DataLedger.ID entry={entry} />,
    },
    {
      title: 'Entry Data',
      render: (entry: DataTxnEntry) => <DataLedger.EntryData entry={entry} />,
    },
  ];

  const { api } = useContext(Shared);
  const [dataChain] = useState(new DataChain(scope, api));
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

      let { total } = r;
      if (typeof total !== 'number') {
        // Pretend that we have another page to make pagination work
        total = (pagination.current + 1) * pagination.pageSize;
      }

      setEntries(r.records);
      setPagination({ ...pagination, total });
      setTotalEntries(r.total);
      setTableIsLoading(false);
    },
    [scope.toString(), JSON.stringify(pagination)],
  );

  return (
    <div>
      <Title level={4} style={{ marginTop: 30 }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiFileList2Line />
        </IconContext.Provider>
        Data Entries
        {(totalEntries || totalEntries == 0) && <Count count={totalEntries} />}
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
    </div>
  );
}

DataLedger.Index = function ({ entry }: { entry: DataTxnEntry }) {
  return (
    <div>
      <Tag color={entry.name === 'scratch' ? 'gray' : 'green'}>
        {entry.name}
      </Tag>
      {entry.index}
    </div>
  );
};

DataLedger.ID = function ({ entry }: { entry: DataTxnEntry }) {
  return (
    <Link to={entry.value.id} dataEntry>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        <RiFileList2Line />
      </IconContext.Provider>
      {Buffer.from(entry.entry).toString('hex')}
    </Link>
  );
};

DataLedger.EntryData = function ({ entry }: { entry: DataTxnEntry }) {
  const data = dataEntryParts(entry.value.message.transaction.body.entry);
  if (data.length == 0) return null;

  const items = data.slice(0, 3).map((item, index) => (
    <ExtId compact key={index}>
      {item}
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
  return <Nobr>{items}</Nobr>;
};
