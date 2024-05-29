import { Descriptions, Typography } from 'antd';
import React, { useState } from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine } from 'react-icons/ri';

import { TransactionType } from 'accumulate.js/lib/core';

import { TxnRecord, isRecordOfDataTxn, isRecordOfTxn } from '../../utils/types';
import { RawData } from '../common/RawData';
import Signatures from '../common/Signatures';
import { describeProperty } from '../common/properties';
import { Settings } from '../explorer/Settings';
import { AddCredits } from './AddCredits';
import { TxnHeader } from './TxnHeader';
import { TxnInfo } from './TxnInfo';
import { TxnMetadata } from './TxnMetadata';
import { WriteData } from './WriteData';

const { Title } = Typography;

export function Transaction({ record }: { record: TxnRecord }) {
  const [rawDataDisplay, setRawDataDisplay] = useState(false);

  return (
    <div>
      <Show record={record} />

      {Settings.enableDevMode && (
        <div>
          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Raw Data
            <RawData.Toggle
              value={rawDataDisplay}
              onChange={setRawDataDisplay}
            />
          </Title>

          <RawData
            data={record.asObject()}
            style={{ marginTop: 0, display: rawDataDisplay ? 'block' : 'none' }}
          />
        </div>
      )}
    </div>
  );
}

function Show({ record }: { record: TxnRecord }) {
  if (isRecordOfDataTxn(record)) {
    return <WriteData record={record} />;
  }
  if (isRecordOfTxn(record, TransactionType.AddCredits)) {
    return <AddCredits record={record} />;
  }

  return <Transaction.Generic record={record} />;
}

Transaction.Generic = function ({ record }: { record: TxnRecord }) {
  const txn = record.message.transaction;
  const txnObj = txn.asObject();
  return (
    <>
      <TxnHeader record={record} />
      <TxnInfo record={record} />
      <TxnMetadata record={record} />

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Properties
      </Title>
      <Descriptions bordered column={1} size="middle" className="info-table">
        {Object.entries(txn).map(([key, value]) => {
          if (key === 'type' || key === 'url') {
            return null;
          }
          return describeProperty({ key, value, obj: txnObj });
        })}
      </Descriptions>

      {record.signatures?.records?.length && (
        <Signatures
          transaction={txn.asObject()}
          data={record.signatures.asObject().records}
        />
      )}
    </>
  );
};
