import { Table, TablePaginationConfig } from 'antd';
import row from 'antd/lib/row';
import { useState } from 'react';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiFolder2Line } from 'react-icons/ri';

import { AccountRecord, RecordType, UrlRecord } from 'accumulate.js/lib/api_v3';

import { Link } from '../../common/Link';
import { queryEffect } from '../../common/Shared';

export function Directory({ record }: { record: AccountRecord }) {
  const [directory, setDirectory] = useState<(UrlRecord | AccountRecord)[]>(
    record.directory?.records || [],
  );
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    current: 1,
    total: record.directory?.total || 0,
    hideOnSinglePage: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
  });

  queryEffect(record.account.url, {
    queryType: 'directory',
    range: {
      start: (pagination.current - 1) * pagination.pageSize,
      count: pagination.pageSize,
      // expand: true, // There's currently no reason to expand since we don't do anything with the info
    },
  }).then((r) => {
    if (r.recordType !== RecordType.Range) return;
    setDirectory(r.records || []);
  });

  const columns = [
    {
      title: 'Accounts',
      render: (row) => <Directory.Entry record={row} />,
    },
  ];

  return (
    <Table
      dataSource={directory}
      columns={columns}
      pagination={pagination}
      rowKey={(r) =>
        r.recordType === RecordType.Url
          ? r.value.toString()
          : r.account.url.toString()
      }
      onChange={(p) => setPagination(p)}
      scroll={{ x: 'max-content' }}
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

  // TODO: do something with the extra info?
  return (
    <Link to={record.account.url}>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        <RiFolder2Line />
      </IconContext.Provider>
      {record.account.url.toString()}
    </Link>
  );
};
