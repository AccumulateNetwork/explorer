import { Descriptions, Tooltip, Typography } from 'antd';
import React, { useContext } from 'react';
import { IconContext } from 'react-icons';
import {
  RiExchangeLine,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';

import { MessageRecord, TxIDRecord } from 'accumulate.js/lib/api_v3';
import { MessageType } from 'accumulate.js/lib/messaging';

import tooltipDescs from '../../utils/lang';
import { EnumValue } from '../common/EnumValue';
import { InfiniteList } from '../common/InfiniteList';
import { InfoTable } from '../common/InfoTable';
import { Link } from '../common/Link';
import { Network } from '../common/Network';
import { Nobr } from '../common/Nobr';
import { RelatedTxn, enrichTxIdRecords, txidKey } from './RelatedTxn';
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

  const { api } = useContext(Network);
  const cause = record.cause?.records || [];
  const produced = record.produced?.records || [];
  const enrich = (items: TxIDRecord[]) => enrichTxIdRecords(api, items);

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

        {cause.length > 0 && (
          <Descriptions.Item label={labelCause}>
            <InfiniteList<TxIDRecord>
              dataSource={cause}
              rowKey={(item) => txidKey(item)}
              enrichPage={enrich}
              renderItem={(item) => <MsgInfo.Related record={item} />}
            />
          </Descriptions.Item>
        )}

        {produced.length > 0 && (
          <Descriptions.Item label={labelProduced}>
            <InfiniteList<TxIDRecord>
              dataSource={produced}
              rowKey={(item) => txidKey(item)}
              enrichPage={enrich}
              renderItem={(item) => (
                <>
                  <MsgInfo.Related record={item} />
                  <Status id={item.value} />
                </>
              )}
            />
          </Descriptions.Item>
        )}
      </InfoTable>
    </>
  );
}

MsgInfo.Related = RelatedTxn;
