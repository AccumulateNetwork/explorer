import React, { useContext, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiFolder2Line } from 'react-icons/ri';

import {
  AccountRecord,
  RecordType,
  UrlRecord,
} from 'accumulate.js/lib/api_v3';

import { InfiniteTable } from '../common/InfiniteList';
import { Link } from '../common/Link';
import { Network } from '../common/Network';

type DirEntry = UrlRecord | AccountRecord;

export function Directory({ record }: { record: AccountRecord }) {
  const { api } = useContext(Network);
  const total = record.directory?.total || 0;

  const loadPage = async (start: number, count: number): Promise<DirEntry[]> => {
    const r = await api.query(record.account.url, {
      queryType: 'directory',
      range: { start, count },
    });
    if (r.recordType !== RecordType.Range) return [];
    return (r.records as DirEntry[]) || [];
  };

  const columns = [
    {
      title: 'Accounts',
      render: (row: DirEntry) => <Directory.Entry record={row} />,
    },
  ];

  return (
    <InfiniteTable<DirEntry>
      total={total}
      loadPage={loadPage}
      columns={columns}
      rowKey={(r) =>
        r.recordType === RecordType.Url
          ? r.value.toString()
          : r.account.url.toString()
      }
    />
  );
}

Directory.Entry = function ({ record }: { record: UrlRecord | AccountRecord }) {
  if (record.recordType === RecordType.Url) {
    return (
      <Link to={record.value}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiFolder2Line />
        </IconContext.Provider>
        {record.value.toString()}
      </Link>
    );
  }

  return (
    <Link to={record.account.url}>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        <RiFolder2Line />
      </IconContext.Provider>
      {record.account.url.toString()}
    </Link>
  );
};
