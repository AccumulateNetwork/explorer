import { Descriptions, Tag, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine, RiRefund2Fill } from 'react-icons/ri';

import { errors } from 'accumulate.js';
import { MessageRecord } from 'accumulate.js/lib/api_v3';
import { SignatureType, TransactionType } from 'accumulate.js/lib/core';
import { MessageType, TransactionMessage } from 'accumulate.js/lib/messaging';

import { computeSignatureState } from '../../utils/signatureState';
import { EnumValue } from '../common/EnumValue';
import { InfoTable } from '../common/InfoTable';
import { Status } from './Status';

const { Title } = Typography;

export function TxnHeader({
  record,
  tags,
}: {
  record: MessageRecord<TransactionMessage>;
  tags?: React.ReactNode;
}) {
  // Votes against the threshold, when there is a governing page. The old
  // count summed key-signature messages and skipped authority signatures —
  // precisely the records that are votes — so a stalled multisig read as
  // complete (#75). Fall back to that count only where no page governs.
  const sigState = computeSignatureState(record.signatures?.records);

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

        {sigState ? (
          <Tag
            style={{ textTransform: 'uppercase' }}
            color={sigState.votes >= sigState.threshold ? 'green' : 'orange'}
          >
            Signatures:{' '}
            <strong>
              {sigState.votes} of {sigState.threshold}
            </strong>
          </Tag>
        ) : (
          sigCount > 0 && (
            <Tag style={{ textTransform: 'uppercase' }}>
              Signatures: <strong>{sigCount}</strong>
            </Tag>
          )
        )}

        {tags}
      </div>

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Transaction Type
      </Title>

      <InfoTable>
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
      </InfoTable>
    </>
  );
}
