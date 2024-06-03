import { useWeb3React } from '@web3-react/core';
import { Input, Table, TablePaginationConfig, Tag, Typography } from 'antd';
import React, { useContext, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiFileList2Line } from 'react-icons/ri';
import SyntaxHighlighter from 'react-syntax-highlighter';

import { URL } from 'accumulate.js';

import { DataChain } from '../../utils/DataChain';
import { DataTxnEntry, TxnEntry, dataEntryParts } from '../../utils/types';
import { Content } from '../common/Content';
import Count from '../common/Count';
import { Link } from '../common/Link';
import { Shared } from '../common/Network';
import { Nobr } from '../common/Nobr';
import { useAsyncEffect } from '../common/useAsync';
import { Backup as Web3Backup } from '../web3/Backup';
import { Settings as Web3Settings } from '../web3/Settings';

const { Title, Text } = Typography;

export function DataLedger({ scope }: { scope: URL }) {
  const { api, network } = useContext(Shared);
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
    [scope.toString(), JSON.stringify(pagination), network.id],
  );

  const { account: eth } = useWeb3React();
  const [web3backup, setWeb3backup] = useState<Web3Backup['entries']>();

  useAsyncEffect(
    async (mounted) => {
      if (!/^[0-9a-f]+$/i.test(scope?.authority)) {
        return;
      }

      const publicKey = Web3Settings.getKey(eth);
      if (!publicKey) {
        return;
      }

      const backup = Web3Backup.for(publicKey);
      const lda = await backup.chain();
      if (!mounted() || !URL.parse(lda).equals(scope)) {
        return;
      }

      await backup.load(api);
      if (!mounted() || !backup.entries) {
        return;
      }

      setWeb3backup(backup.entries);
    },
    [`${scope}`, eth],
  );

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
      render: (entry: DataTxnEntry) => (
        <DataLedger.EntryData entry={entry} web3backup={web3backup} />
      ),
    },
  ];

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

DataLedger.EntryData = function ({
  entry,
  web3backup,
}: {
  entry: DataTxnEntry;
  web3backup: Web3Backup['entries'];
}) {
  const [hash, setHash] = useState<string>();

  useAsyncEffect(
    async (mounted) => {
      const hash = await entry.value.message.transaction.body.entry.hash();
      if (!mounted()) {
        return;
      }
      setHash(Buffer.from(hash).toString('hex'));
    },
    [entry],
  );

  if (web3backup && hash in web3backup) {
    return (
      <Input.Group compact className="extid">
        <Text className="extid-type">Web3 Backup</Text>
        <Text className="extid-text extid-json">
          <SyntaxHighlighter language="json">
            {JSON.stringify(web3backup[hash])}
          </SyntaxHighlighter>
        </Text>
      </Input.Group>
    );
  }

  const data = dataEntryParts(entry.value.message.transaction.body.entry);
  if (data.length == 0) return null;

  const items = data.slice(0, 3).map((item, index) => (
    <Content compact key={index}>
      {item}
    </Content>
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
