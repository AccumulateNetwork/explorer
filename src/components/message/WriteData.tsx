import { Descriptions, List, Tag, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiFileList2Line,
  RiInformationLine,
} from 'react-icons/ri';

import { URL } from 'accumulate.js';
import { TransactionType } from 'accumulate.js/lib/core';

import { DataTxnRecord, dataEntryParts } from '../../utils/types';
import { AccTitle } from '../common/AccTitle';
import { Content } from '../common/Content';
import { InfoTable } from '../common/InfoTable';
import { Link } from '../common/Link';
import { TxnHeader } from './TxnHeader';
import { TxnInfo } from './TxnInfo';
import { TxnMetadata } from './TxnMetadata';

const { Title } = Typography;

export function WriteData({ record }: { record: DataTxnRecord }) {
  const txn = record.message.transaction;
  return (
    <>
      <AccTitle title="Transaction" url={record.id} />
      <TxnHeader record={record} />
      <TxnInfo record={record} />
      <TxnMetadata record={record} />

      {txn.body.type === TransactionType.WriteDataTo && (
        <>
          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Write Data
          </Title>

          <InfoTable>
            <Descriptions.Item label="To">
              <Link to={txn.body.recipient}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiAccountCircleLine />
                </IconContext.Provider>
                {txn.body.recipient.toString()}
              </Link>
            </Descriptions.Item>
          </InfoTable>
        </>
      )}

      <Entries record={record} />
    </>
  );
}

const DN_NETWORK = URL.parse('dn.acme/network');

function Entries({ record }: { record: DataTxnRecord }) {
  const txn = record.message.transaction;
  if (txn.header.principal.equals(DN_NETWORK)) {
    // TODO Decode network updates like acc://61041b67e9d9a78ed2a9c76dc9874b74120234c3b6d5be2a6514fb1070226d59@dn.acme/network
  }

  const scratch = 'scratch' in txn.body && txn.body.scratch;
  const writeToState = 'writeToState' in txn.body && txn.body.writeToState;
  return (
    <>
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiFileList2Line />
        </IconContext.Provider>
        Entries
      </Title>

      {(scratch || writeToState) && (
        <div style={{ marginBottom: '20px' }}>
          {scratch && <Tag color="gray">scratch</Tag>}
          {writeToState && <Tag color="blue">write to state</Tag>}
        </div>
      )}

      <List
        size="small"
        bordered
        dataSource={dataEntryParts(txn.body.entry)}
        renderItem={(item) => (
          <List.Item>
            <Content>{item}</Content>
          </List.Item>
        )}
        style={{ marginBottom: '30px' }}
      />
    </>
  );
}
