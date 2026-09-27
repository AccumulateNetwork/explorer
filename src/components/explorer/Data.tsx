import { Descriptions, Skeleton, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiFileList2Line } from 'react-icons/ri';
import { useParams } from 'react-router-dom';

import { URL } from 'accumulate.js';
import { TransactionType } from 'accumulate.js/lib/core';

import {
  DataTxnRecord,
  dataEntryParts,
  isRecordOfDataTxn,
} from '../../utils/types';
import { encodeURLSpaces } from '../../utils/url';
import { Content } from '../common/Content';
import { EnumValue } from '../common/EnumValue';
import { InfiniteList } from '../common/InfiniteList';
import { InfoTable } from '../common/InfoTable';
import { useQuery } from '../common/useQuery';
import { TxnInfo } from '../message/TxnInfo';
import Error404 from './Error404';

const { Title } = Typography;

export default Data;

export function Data() {
  // Return 404 if url is not a valid URL or transaction hash
  const params = useParams();
  const dataURL = params['*'] || '';
  const [url, setUrl] = useState<URL>();
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    if (/^[0-9a-f]{64}$/i.test(dataURL)) {
      setUrl(URL.parse(`acc://${dataURL}@unknown`));
    } else {
      let url: URL;
      try {
        url = URL.parse(encodeURLSpaces(dataURL));
      } catch {
        // Without this return, execution fell through to url.username with
        // url still undefined — a TypeError from the effect put the
        // ErrorBoundary screen up instead of the intended 404 (#47).
        setNotFound(true);
        return;
      }
      if (!/[0-9a-f]{64}/i.test(url.username)) {
        setNotFound(true);
      }
      document.title = `${url.username} | Accumulate Explorer`;
      setUrl(url);
    }
  }, [dataURL]);

  const [record, setRecord] = useState<DataTxnRecord>(null);
  const entry = useQuery(url, { queryType: 'default' });
  useEffect(() => {
    if (!entry.data) {
      return;
    }
    if (!isRecordOfDataTxn(entry.data)) {
      setNotFound(true);
      return;
    }
    setRecord(entry.data);
    // Canonicalizes the URL the query itself runs against. Safe because the
    // query key is the URL's text, which this does not change.
    setUrl(entry.data.id.asUrl());
  }, [entry.data]);

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

      {record ? <ShowDataEntry record={record} /> : <Skeleton active />}
    </div>
  );
}

function ShowDataEntry({ record }: { record: DataTxnRecord }) {
  return (
    <div>
      <InfoTable>
        <Descriptions.Item label="Type">
          <EnumValue
            type={TransactionType}
            value={record.message.transaction.body.type}
          />
        </Descriptions.Item>
      </InfoTable>

      <TxnInfo record={record} />

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiFileList2Line />
        </IconContext.Provider>
        Entry Data
      </Title>

      <div style={{ marginBottom: '30px' }}>
        <InfiniteList<Uint8Array>
          className="ant-list-sm"
          dataSource={dataEntryParts(record.message.transaction.body.entry)}
          renderItem={(item) => <Content>{item}</Content>}
        />
      </div>
    </div>
  );
}
