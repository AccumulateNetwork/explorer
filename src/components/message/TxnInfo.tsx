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

import { EntryHash } from '../common/EntryHash';
import { Link } from '../common/Link';
import { Nobr } from '../common/Nobr';
import tooltipDescs from '../common/TooltipDescriptions';
import { describeTimestamp } from './timestamp';

const { Title, Text } = Typography;

export function TxnInfo({
  record,
}: {
  record: MessageRecord<TransactionMessage>;
}) {
  const [showAllProduced, setShowAllProduced] = useState(false);

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

  const labelEntryHash = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.entryHash}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Entry Hash
      </Nobr>
    </span>
  );

  const txn = record.message.transaction;
  const entry = 'entry' in txn.body && txn.body.entry;
  return (
    <>
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Transaction Info
      </Title>

      <Descriptions bordered column={1} size="middle" className="info-table">
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

        <Descriptions.Item label={labelPrincipal}>
          <Link to={txn.header.principal}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiAccountCircleLine />
            </IconContext.Provider>
            {txn.header.principal.toString()}
          </Link>
        </Descriptions.Item>

        {record.produced?.records?.length > 0 && (
          <Descriptions.Item
            className={'align-top has-list'}
            label={labelProduced}
          >
            {record.produced.records
              .slice(0, showAllProduced ? record.produced.records.length : 5)
              .map((item) => (
                <List.Item key={item.value.toString()}>
                  <TxnInfo.Produced record={item} />
                </List.Item>
              ))}
            {record.produced.records.length > 5 && !showAllProduced && (
              <List.Item key={'more'}>
                <Button onClick={() => setShowAllProduced(true)}>
                  +{record.produced.records.length - 5} more
                </Button>
              </List.Item>
            )}
          </Descriptions.Item>
        )}
      </Descriptions>
    </>
  );
}

TxnInfo.Produced = function ({ record }: { record: TxIDRecord }) {
  return (
    <Link to={record.value}>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        <RiExchangeLine />
      </IconContext.Provider>
      {record.value.toString()}
    </Link>
  );
};
