import { Descriptions, List, Tooltip, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import {
  RiExchangeLine,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';

import { MessageRecord, TxIDRecord } from 'accumulate.js/lib/api_v3';
import { MessageType } from 'accumulate.js/lib/messaging';

import tooltipDescs from '../../utils/lang';
import { CompactList } from '../common/CompactList';
import { EnumValue } from '../common/EnumValue';
import { InfoTable } from '../common/InfoTable';
import { Link } from '../common/Link';
import { Nobr } from '../common/Nobr';
import { Status } from './Status';
import { describeTimestamp } from './timestamp';

const { Title } = Typography;

export function MsgInfo({ record }: { record: MessageRecord }) {
  const labelID = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.msgId}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        ID
      </Nobr>
    </span>
  );

  const labelTxn = (
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
        Transaction
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

  const cause = record.cause?.records || [];
  const produced = record.produced?.records || [];

  return (
    <>
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Message Info
      </Title>

      <InfoTable>
        {describeTimestamp(record.id)}

        <Descriptions.Item key="id" label={labelID}>
          {record.id.toString()}
        </Descriptions.Item>

        {'txID' in record.message && (
          <Descriptions.Item label={labelTxn}>
            <Link to={record.message.txID}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiExchangeLine />
              </IconContext.Provider>
              {record.message.txID.toString()}
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
                  <MsgInfo.Related record={item} />
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
                  <MsgInfo.Related record={item} />
                  <Status id={item.value} />
                </List.Item>
              )}
            />
          </Descriptions.Item>
        )}
      </InfoTable>
    </>
  );
}

MsgInfo.Related = function ({ record }: { record: TxIDRecord }) {
  return (
    <Link to={record.value}>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        <RiExchangeLine />
      </IconContext.Provider>
      {record.value.toString()}
    </Link>
  );
};
