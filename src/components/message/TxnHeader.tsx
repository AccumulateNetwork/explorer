import { Descriptions, Tag, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine, RiRefund2Fill } from 'react-icons/ri';

import { errors } from 'accumulate.js';
import { MessageRecord } from 'accumulate.js/lib/api_v3';
import { SignatureType, TransactionType } from 'accumulate.js/lib/core';
import { MessageType, TransactionMessage } from 'accumulate.js/lib/messaging';

import { EnumValue } from '../common/EnumValue';
import { Status } from './Status';

const { Title } = Typography;

export function TxnHeader({
  record,
}: {
  record: MessageRecord<TransactionMessage>;
}) {
  let sigCount = 0;
  for (const set of record.signatures?.records || []) {
    for (const sig of set.signatures?.records || []) {
      // Ignore non-signatures
      if (sig.message?.type !== MessageType.Signature) continue;

      // Don't count authority signatures
      if (sig.message.signature?.type === SignatureType.Authority) continue;

      sigCount++;
    }
  }

  const txn = record.message.transaction;
  return (
    <>
      <div style={{ marginBottom: '20px' }}>
        <Status record={record} />

        {record.status === errors.Status.Pending && (
          <Tag color="cyan" style={{ textTransform: 'uppercase' }}>
            <IconContext.Provider
              value={{ className: 'react-icons' }}
            ></IconContext.Provider>
            Multi-sig
          </Tag>
        )}

        {sigCount > 0 && (
          <Tag style={{ textTransform: 'uppercase' }}>
            Signatures: <strong>{sigCount}</strong>
          </Tag>
        )}
      </div>

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Transaction Type
      </Title>

      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label="Type">
          <EnumValue type={TransactionType} value={txn.body.type} />
          {'isRefund' in txn.body && txn.body.isRefund && (
            <Tag
              color="orange"
              style={{ marginLeft: 10, textTransform: 'uppercase' }}
            >
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiRefund2Fill />
              </IconContext.Provider>
              Refund
            </Tag>
          )}
        </Descriptions.Item>
      </Descriptions>
    </>
  );
}
