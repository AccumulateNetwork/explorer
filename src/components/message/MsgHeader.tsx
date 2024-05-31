import { Descriptions, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine } from 'react-icons/ri';

import { MessageRecord } from 'accumulate.js/lib/api_v3';
import { MessageType } from 'accumulate.js/lib/messaging';

import { EnumValue } from '../common/EnumValue';
import { InfoTable } from '../common/InfoTable';
import { Status } from './Status';

const { Title } = Typography;

export function MsgHeader({ record }: { record: MessageRecord }) {
  return (
    <>
      <div style={{ marginBottom: '20px' }}>
        <Status record={record} />
      </div>

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Message Type
      </Title>

      <InfoTable>
        <Descriptions.Item label="Type">
          <EnumValue type={MessageType} value={record.message.type} />
        </Descriptions.Item>
      </InfoTable>
    </>
  );
}
