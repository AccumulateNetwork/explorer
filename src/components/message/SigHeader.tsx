import { Descriptions, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine } from 'react-icons/ri';

import { MessageRecord } from 'accumulate.js/lib/api_v3';
import { SignatureType } from 'accumulate.js/lib/core';
import { SignatureMessage } from 'accumulate.js/lib/messaging';

import { EnumValue } from '../common/EnumValue';
import { Status } from './Status';

const { Title } = Typography;

export function SigHeader({
  record,
}: {
  record: MessageRecord<SignatureMessage>;
}) {
  return (
    <>
      <div style={{ marginBottom: '20px' }}>
        <Status record={record} />
      </div>

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Signature Type
      </Title>

      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label="Type">
          <EnumValue
            type={SignatureType}
            value={record.message.signature.type}
          />
        </Descriptions.Item>
      </Descriptions>
    </>
  );
}
