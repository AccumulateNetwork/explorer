import { Descriptions, List, Skeleton, Typography } from 'antd';
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
import { Content } from '../common/Content';
import { EnumValue } from '../common/EnumValue';
import { InfoTable } from '../common/InfoTable';
import { queryEffect } from '../common/query';
import { TxnInfo } from '../message/TxnInfo';
import Error404 from './Error404';

const { Title } = Typography;

export function Data() {
  // Return 404 if url is not a valid URL or transaction hash
  const params = useParams<{ url: string }>();
  const [url, setUrl] = useState<URL>();
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    if (/^[0-9a-f]{64}$/i.test(params.url)) {
      setUrl(URL.parse(`acc://${params.url}@unknown`));
    } else {
      let url: URL;
      try {
        url = URL.parse(params.url);
      } catch (error) {
        setNotFound(true);
      }
      if (!/[0-9a-f]{64}/i.test(url.username)) {
        setNotFound(true);
      }
      document.title = `${url.username} | Accumulate Explorer`;
      setUrl(url);
    }
  }, [params.url]);

  const [record, setRecord] = useState<DataTxnRecord>(null);
  queryEffect(url, { queryType: 'default' }).then((r) => {
    if (!isRecordOfDataTxn(r)) {
      setNotFound(true);
      return;
    }
    setRecord(r);
    setUrl(r.id.asUrl());
  });

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

      <List
        size="small"
        bordered
        dataSource={dataEntryParts(record.message.transaction.body.entry)}
        renderItem={(item) => (
          <List.Item>
            <Content>{item}</Content>
          </List.Item>
        )}
        style={{ marginBottom: '30px' }}
      />
    </div>
  );
}
