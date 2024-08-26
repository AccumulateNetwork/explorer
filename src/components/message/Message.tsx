import { Descriptions, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine } from 'react-icons/ri';

import { MessageRecord } from 'accumulate.js/lib/api_v3';
import {
  SignatureMessage,
  TransactionMessage,
} from 'accumulate.js/lib/messaging';

import { isRecordOf } from '../../utils/types';
import { AccTitle } from '../common/AccTitle';
import { InfoTable } from '../common/InfoTable';
import { describeProperty } from '../common/properties';
import { MsgHeader } from './MsgHeader';
import { MsgInfo } from './MsgInfo';
import { Signature } from './Signature';
import { Transaction } from './Transaction';

const { Title } = Typography;

export function Message({ record }: { record: MessageRecord }) {
  if (isRecordOf(record, TransactionMessage)) {
    return <Transaction record={record} />;
  }
  if (isRecordOf(record, SignatureMessage)) {
    return <Signature record={record} />;
  }
  return <Message.Generic record={record} />;
}

Message.Generic = function ({ record }: { record: MessageRecord }) {
  const msgObj = record.message.asObject();
  return (
    <>
      <AccTitle title="Message" url={record.id} />
      <MsgHeader record={record} />
      <MsgInfo record={record} />

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Properties
      </Title>

      <InfoTable>
        {Object.entries(record.message).map(([key, value]) => {
          if (key === 'type') {
            return null;
          }
          return describeProperty({ key, value, obj: msgObj });
        })}
      </InfoTable>
    </>
  );
};
