import { Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine } from 'react-icons/ri';

import { core } from 'accumulate.js';

import { TxnRecord, isRecordOf, isRecordOfDataTxn } from '../../utils/types';
import { AccTitle } from '../common/AccTitle';
import { InfoTable } from '../common/InfoTable';
import { Signatures } from '../common/Signatures';
import { describeProperty } from '../common/properties';
import { AddCredits } from './AddCredits';
import { Deposit } from './Deposit';
import { SendTokens } from './SendTokens';
import { TxnHeader } from './TxnHeader';
import { TxnInfo } from './TxnInfo';
import { TxnMetadata } from './TxnMetadata';
import { UpdateAccountAuth } from './UpdateAccountAuth';
import { UpdateKeyPage } from './UpdateKeyPage';
import { WriteData } from './WriteData';

const { Title } = Typography;

export function Transaction({ record }: { record: TxnRecord }) {
  const txn = record.message.transaction;
  return (
    <div>
      <Show record={record} />

      {record.signatures?.records?.length && (
        <Signatures transaction={txn} signatures={record.signatures.records} />
      )}
    </div>
  );
}

function Show({ record }: { record: TxnRecord }) {
  if (isRecordOfDataTxn(record)) {
    return <WriteData record={record} />;
  }
  if (isRecordOf(record, core.AddCredits)) {
    return <AddCredits record={record} />;
  }
  if (isRecordOf(record, core.SendTokens, core.IssueTokens)) {
    return <SendTokens record={record} />;
  }
  if (
    isRecordOf(
      record,
      core.SyntheticDepositTokens,
      core.SyntheticDepositCredits,
      core.SyntheticBurnTokens,
    )
  ) {
    return <Deposit record={record} />;
  }
  if (isRecordOf(record, core.UpdateAccountAuth)) {
    return <UpdateAccountAuth record={record} />;
  }
  if (isRecordOf(record, core.UpdateKeyPage)) {
    return <UpdateKeyPage record={record} />;
  }

  return <Transaction.Generic record={record} />;
}

Transaction.Generic = function ({ record }: { record: TxnRecord }) {
  const txn = record.message.transaction;
  const txnObj = txn.asObject();
  return (
    <>
      <AccTitle title="Transaction" url={record.id} />
      <TxnHeader record={record} />
      <TxnInfo record={record} />
      <TxnMetadata record={record} />

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Properties
      </Title>

      <InfoTable>
        {Object.entries(txn.body).map(([key, value]) => {
          if (key === 'type') {
            return null;
          }
          return describeProperty({ key, value, obj: txnObj.body });
        })}
      </InfoTable>
    </>
  );
};
