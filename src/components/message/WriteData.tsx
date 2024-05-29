import { Descriptions, List, Tag, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiFileList2Line,
  RiInformationLine,
} from 'react-icons/ri';

import { TransactionType } from 'accumulate.js/lib/core';

import { DataTxnRecord, dataEntryParts } from '../../utils/types';
import { AccTitle } from '../common/AccTitle';
import Data from '../common/ExtId';
import { Link } from '../common/Link';
import Signatures from '../common/Signatures';
import { TxnHeader } from './TxnHeader';
import { TxnInfo } from './TxnInfo';
import { TxnMetadata } from './TxnMetadata';

const { Title } = Typography;

export function WriteData({ record }: { record: DataTxnRecord }) {
  const txn = record.message.transaction;
  const scratch = 'scratch' in txn.body && txn.body.scratch;
  const writeToState = 'writeToState' in txn.body && txn.body.writeToState;
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

          <Descriptions
            bordered
            column={1}
            size="middle"
            className="info-table"
          >
            <Descriptions.Item label="To">
              <Link to={txn.body.recipient}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiAccountCircleLine />
                </IconContext.Provider>
                {txn.body.recipient.toString()}
              </Link>
            </Descriptions.Item>
          </Descriptions>
        </>
      )}

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
            <Data>{item}</Data>
          </List.Item>
        )}
        style={{ marginBottom: '30px' }}
      />

      {record.signatures?.records?.length && (
        <Signatures
          transaction={txn.asObject()}
          data={record.signatures.asObject().records}
        />
      )}
    </>
  );
}
