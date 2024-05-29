import { Descriptions, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiAccountCircleLine, RiInformationLine } from 'react-icons/ri';

import { core } from 'accumulate.js';

import { TxnRecord } from '../../utils/types';
import { AccTitle } from '../common/AccTitle';
import {
  CreditAmountFromACME,
  OracleValue,
  TokenAmount,
} from '../common/Amount';
import { Link } from '../common/Link';
import { TxnHeader } from './TxnHeader';
import { TxnInfo } from './TxnInfo';
import { TxnMetadata } from './TxnMetadata';

const { Title, Text } = Typography;

export function AddCredits({ record }: { record: TxnRecord<core.AddCredits> }) {
  const txn = record.message.transaction;
  return (
    <>
      <AccTitle title="Transaction" url={record.id} />
      <TxnHeader record={record} />
      <TxnInfo record={record} />
      <TxnMetadata record={record} />

      <Title level={4} style={{ marginTop: 30 }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Purchase Credits
      </Title>

      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label="Recipient">
          <Link to={txn.body.recipient}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiAccountCircleLine />
            </IconContext.Provider>
            {txn.body.recipient.toString()}
          </Link>
        </Descriptions.Item>

        <Descriptions.Item label="Credits">
          <Text>
            <CreditAmountFromACME
              amount={txn.body.amount}
              oracle={txn.body.oracle}
            />
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="ACME">
          <Text>
            <TokenAmount amount={txn.body.amount} issuer="ACME" />
          </Text>
        </Descriptions.Item>

        <Descriptions.Item label="Oracle">
          <Text>
            <OracleValue value={txn.body.oracle} />
          </Text>
        </Descriptions.Item>
      </Descriptions>
    </>
  );
}
