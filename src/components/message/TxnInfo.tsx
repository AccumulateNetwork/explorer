import { Button, Descriptions, List, Tooltip, Typography } from 'antd';
import React, { useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiExchangeLine,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';

import { MessageRecord, TxIDRecord } from 'accumulate.js/lib/api_v3';
import { TransactionMessage } from 'accumulate.js/lib/messaging';

import tooltipDescs from '../../utils/lang';
import { CompactList } from '../common/CompactList';
import { EntryHash } from '../common/EntryHash';
import { InfoTable } from '../common/InfoTable';
import { Link } from '../common/Link';
import { Nobr } from '../common/Nobr';
import { describeTimestamp } from './timestamp';

const { Title, Text } = Typography;

export function TxnInfo({
  record,
}: {
  record: MessageRecord<TransactionMessage>;
}) {
  const labelID = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.txId}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Txid
      </Nobr>
    </span>
  );

  const labelHash = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.txHash}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        TxHash
      </Nobr>
    </span>
  );

  const labelEntryHash = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip overlayClassName="explorer-tooltip">
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Entry Hash
      </Nobr>
    </span>
  );

  const labelPrincipal = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.sponsor}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Principal
      </Nobr>
    </span>
  );

  const labelCause = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.cause}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Cause
      </Nobr>
    </span>
  );

  const labelProduced = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.produced}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Produced
      </Nobr>
    </span>
  );

  const txn = record.message.transaction;
  const entry = 'entry' in txn.body && txn.body.entry;
  const cause = record.cause?.records || [];
  const produced = record.produced?.records || [];
  return (
    <>
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Transaction Info
      </Title>

      <InfoTable>
        {describeTimestamp(record.id)}

        <Descriptions.Item label={labelID}>
          <Text copyable>{record.id.toString()}</Text>
        </Descriptions.Item>

        <Descriptions.Item label={labelHash}>
          <Text copyable className={'code'}>
            {Buffer.from(record.id.hash).toString('hex')}
          </Text>
        </Descriptions.Item>

        {entry && (
          <Descriptions.Item label={labelEntryHash}>
            <EntryHash entry={entry} />
          </Descriptions.Item>
        )}

        {txn.header?.principal && (
          <Descriptions.Item label={labelPrincipal}>
            <Link to={txn.header.principal}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiAccountCircleLine />
              </IconContext.Provider>
              {txn.header.principal.toString()}
            </Link>
          </Descriptions.Item>
        )}

        {cause.length && (
          <Descriptions.Item label={labelCause}>
            <CompactList
              dataSource={cause}
              limit={5}
              renderItem={(item) => (
                <List.Item>
                  <TxnInfo.Related record={item} />
                </List.Item>
              )}
            />
          </Descriptions.Item>
        )}

        {produced.length && (
          <Descriptions.Item label={labelProduced}>
            <CompactList
              dataSource={produced}
              limit={5}
              renderItem={(item) => (
                <List.Item>
                  <TxnInfo.Related record={item} />
                </List.Item>
              )}
            />
          </Descriptions.Item>
        )}
      </InfoTable>
    </>
  );
}

TxnInfo.Related = function ({ record }: { record: TxIDRecord }) {
  return (
    <Link to={record.value}>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        <RiExchangeLine />
      </IconContext.Provider>
      {record.value.toString()}
    </Link>
  );
};
