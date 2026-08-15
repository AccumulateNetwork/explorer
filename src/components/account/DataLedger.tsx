import { Input, Tag, Typography } from 'antd';
import React, { useContext, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiFileList2Line } from 'react-icons/ri';

import { URL } from 'accumulate.js';

import { DataChain } from '../../utils/DataChain';
import { DataTxnEntry, TxnEntry, dataEntryParts } from '../../utils/types';
import { Content } from '../common/Content';
import Count from '../common/Count';
import { InfiniteTable } from '../common/InfiniteList';
import { Json } from '../common/Json';
import { Link } from '../common/Link';
import { Network } from '../common/Network';
import { Nobr } from '../common/Nobr';
import { useAsyncEffect } from '../common/useAsync';
import { useWeb3 } from '../web3/Context';

const { Title, Text } = Typography;

const PAGE_SIZE = 25;

export function DataLedger({ scope }: { scope: URL }) {
  const { api, network } = useContext(Network);
  const [dataChain] = useState(new DataChain(scope, api));
  const [total, setTotal] = useState<number | null>(null);
  const [totalEntries, setTotalEntries] = useState(-1);

  useAsyncEffect(
    async (mounted) => {
      const r = await dataChain.getRange({ start: 0, count: 1 });
      if (!mounted()) return;

      let t = r.total;
      if (typeof t !== 'number') {
        // Pretend that we have another page to make pagination work.
        t = PAGE_SIZE * 2;
      }
      setTotal(t);
      setTotalEntries(r.total);
    },
    [scope.toString(), network.id],
  );

  const loadPage = async (
    start: number,
    count: number,
  ): Promise<TxnEntry[]> => {
    const r = await dataChain.getRange({ start, count });

    let t = r.total;
    if (typeof t !== 'number') {
      // Pretend that there's another page so the window keeps fetching.
      t = start + count + PAGE_SIZE;
    }
    setTotal(t);
    setTotalEntries(r.total);

    return r.records || [];
  };

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

  return (
    <div>
      <Title level={4} style={{ marginTop: 30 }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiFileList2Line />
        </IconContext.Provider>
        Data Entries
        {(totalEntries || totalEntries == 0) && <Count count={totalEntries} />}
      </Title>

      {total !== null && (
        <InfiniteTable<TxnEntry>
          total={total}
          loadPage={loadPage}
          columns={columns}
          rowKey="entry"
          pageSize={PAGE_SIZE}
        />
      )}
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
  const [hash, setHash] = useState<string>();
  const web3 = useWeb3();

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

  const storeEntry = web3.onlineStore?.get(hash);
  if (storeEntry && web3.onlineStore.url.equals(entry.value.id.account)) {
    return (
      <Input.Group compact className="extid">
        <Text className="extid-type">Web3 Backup</Text>
        <Text className="extid-text extid-json">
          <Json>{JSON.stringify(storeEntry)}</Json>
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
        +{extra} more
      </Tag>,
    );
  }
  return <Nobr>{items}</Nobr>;
};
