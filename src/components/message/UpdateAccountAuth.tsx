import { List, Tag, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiAccountCircleLine, RiInformationLine } from 'react-icons/ri';

import { core } from 'accumulate.js';
import {
  AccountAuthOperation,
  AccountAuthOperationType,
} from 'accumulate.js/lib/core';

import { TxnRecord } from '../../utils/types';
import { AccTitle } from '../common/AccTitle';
import { EnumValue } from '../common/EnumValue';
import { Link } from '../common/Link';
import { TxnHeader } from './TxnHeader';
import { TxnInfo } from './TxnInfo';
import { TxnMetadata } from './TxnMetadata';

const { Title } = Typography;

export function UpdateAccountAuth({
  record,
}: {
  record: TxnRecord<core.UpdateAccountAuth>;
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
        dataSource={record.message.transaction.body.operations}
        renderItem={(op) => (
          <List.Item>
            <UpdateAccountAuth.Operation operation={op} />
          </List.Item>
        )}
      />
    </>
  );
}

UpdateAccountAuth.Operation = function ({
  operation,
}: {
  operation: AccountAuthOperation;
}) {
  let type: React.ReactNode;
  switch (operation.type) {
    case AccountAuthOperationType.AddAuthority:
      type = <Tag color="green">Add</Tag>;
      break;
    case AccountAuthOperationType.RemoveAuthority:
      type = <Tag color="red">Remove</Tag>;
      break;
    case AccountAuthOperationType.Enable:
      type = <Tag color="blue">Enable</Tag>;
      break;
    case AccountAuthOperationType.Disable:
      type = <Tag color="orange">Disable</Tag>;
      break;
    default:
      type = (
        <Tag color="default">
          <EnumValue
            type={AccountAuthOperationType}
            value={(operation as any).type}
          />
        </Tag>
      );
      break;
  }
  return (
    <div>
      {type}
      <Link to={operation.authority}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiAccountCircleLine />
        </IconContext.Provider>
        {operation.authority.toString()}
      </Link>
    </div>
  );
};
