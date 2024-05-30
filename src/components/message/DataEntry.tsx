import { Descriptions, List, Skeleton, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiFileList2Line } from 'react-icons/ri';

import { URL } from 'accumulate.js';
import { TransactionType } from 'accumulate.js/lib/core';

import getTs from '../../utils/getTS';
import {
  DataTxnRecord,
  dataEntryParts,
  isRecordOfDataTxn,
} from '../../utils/types';
import { EnumValue } from '../common/EnumValue';
import Data from '../common/ExtId';
import { queryEffect } from '../common/query';
import Error404 from '../explorer/Error404';
import { TxnInfo } from './TxnInfo';

const { Title } = Typography;

export function DataEntry(props: { url: string }) {
  // Return 404 if url is not a valid URL or transaction hash
  const [url, setUrl] = useState<URL>();
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    if (/^[0-9a-f]{64}$/i.test(props.url)) {
      setUrl(URL.parse(`acc://${props.url}@unknown`));
    } else {
      let url: URL;
      try {
        url = URL.parse(props.url);
      } catch (error) {
        setNotFound(true);
      }
      if (!/[0-9a-f]{64}/i.test(url.username)) {
        setNotFound(true);
      }
      setUrl(url);
    }
  }, [props.url]);

  const [record, setRecord] = useState<DataTxnRecord>(null);
  queryEffect(url, { queryType: 'default' }).then((r) => {
    if (!isRecordOfDataTxn(r)) {
      setNotFound(true);
      return;
    }
    setRecord(r);
    setUrl(r.id.asUrl());
  });

  const [ts, setTs] = useState(null);
  const [block, setBlock] = useState(null);

  useEffect(() => {
    if (!url) return;
    let txId = url.toString().replace(/^acc:\/\/|@.*$/g, '');
    getTs(
      txId,
      setTs,
      setBlock,
      (x) => x.chain === 'main' || x.chain === 'scratch',
    );
  }, [`${url}`]);

  if (notFound) {
    return <Error404 />;
  }

  return (
    <div>
      <Title level={2} className="break-all" key="main">
        Data Entry
      </Title>
      <Title
        level={4}
        key="sub"
        type="secondary"
        style={{ marginTop: '-10px' }}
        className="break-all"
        copyable={{ text: url?.toString() }}
      >
        {url?.toString()}
      </Title>

      {record ? (
        <ShowDataEntry record={record} ts={ts} block={block} />
      ) : (
        <Skeleton active />
      )}
    </div>
  );
}

function ShowDataEntry({
  record,
  block,
  ts,
}: {
  record: DataTxnRecord;
  block;
  ts;
}) {
  return (
    <div>
      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label="Type">
          <EnumValue
            type={TransactionType}
            value={record.message.transaction.body.type}
          />
        </Descriptions.Item>
      </Descriptions>

      <TxnInfo record={record} />

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiFileList2Line />
        </IconContext.Provider>
        Entry Data
      </Title>

      <List
        size="small"
        bordered
        dataSource={dataEntryParts(record.message.transaction.body.entry)}
        renderItem={(item) => (
          <List.Item>
            <Data>{item}</Data>
          </List.Item>
        )}
        style={{ marginBottom: '30px' }}
      />
    </div>
  );
}
