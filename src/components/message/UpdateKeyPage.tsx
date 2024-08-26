import { List, Tag, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiAccountCircleLine, RiInformationLine } from 'react-icons/ri';

import { core } from 'accumulate.js';
import {
  KeyPageOperation,
  KeyPageOperationType,
  KeySpecParams,
  TransactionType,
} from 'accumulate.js/lib/core';

import { TxnRecord } from '../../utils/types';
import { AccTitle } from '../common/AccTitle';
import { EnumValue } from '../common/EnumValue';
import Key from '../common/Key';
import { Link } from '../common/Link';
import { TxnHeader } from './TxnHeader';
import { TxnInfo } from './TxnInfo';
import { TxnMetadata } from './TxnMetadata';

const { Title, Text } = Typography;

export function UpdateKeyPage({
  record,
}: {
  record: TxnRecord<core.UpdateKeyPage>;
}) {
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
        Operations
      </Title>

      <List
        bordered
        size="small"
        dataSource={record.message.transaction.body.operation}
        renderItem={(op) => (
          <List.Item>
            <UpdateKeyPage.Operation operation={op} />
          </List.Item>
        )}
      />
    </>
  );
}

UpdateKeyPage.Operation = function ({
  operation,
}: {
  operation: KeyPageOperation;
}) {
  let bits: React.ReactNode;
  switch (operation.type) {
    case KeyPageOperationType.Update:
      bits = (
        <span>
          <KeySpec spec={operation.oldEntry} /> →{' '}
          <KeySpec spec={operation.newEntry} />
        </span>
      );
      break;
    case KeyPageOperationType.Remove:
    case KeyPageOperationType.Add:
      bits = <KeySpec spec={operation.entry} />;
      break;
    case KeyPageOperationType.SetThreshold:
    case KeyPageOperationType.SetRejectThreshold:
    case KeyPageOperationType.SetResponseThreshold:
      bits = <Text>{operation.threshold || 0}</Text>;
      break;
    case KeyPageOperationType.UpdateAllowed:
      bits = [
        ...operation.allow?.map((type, i) => (
          <Tag>
            +{' '}
            <EnumValue key={`allow${i}`} type={TransactionType} value={type} />
          </Tag>
        )),
        ...operation.deny?.map((type, i) => (
          <Tag>
            - <EnumValue key={`deny${i}`} type={TransactionType} value={type} />
          </Tag>
        )),
      ];
      break;
    default:
      bits = '(unknown)';
      break;
  }
  return (
    <div>
      <Tag color="default">
        <EnumValue
          type={KeyPageOperationType}
          value={(operation as any).type}
        />
      </Tag>
      {bits}
    </div>
  );
};

function KeySpec({ spec: { keyHash, delegate } }: { spec: KeySpecParams }) {
  const bits: React.ReactNode[] = [];
  if (delegate) {
    bits.push(
      <Link key="delegate" to={delegate}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiAccountCircleLine />
        </IconContext.Provider>
        {delegate.toString()}
      </Link>,
    );
  }
  if (keyHash) {
    bits.push(<Key key="key" keyHash={keyHash} />);
  }
  if (!bits.length) {
    return <Tag>Empty Entry</Tag>;
  }
  return <span>{bits}</span>;
}
