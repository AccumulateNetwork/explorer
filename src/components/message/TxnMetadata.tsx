import { Descriptions, Tooltip, Typography } from 'antd';
import moment from 'moment';
import React from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';

import { MessageRecord } from 'accumulate.js/lib/api_v3';
import { TransactionMessage } from 'accumulate.js/lib/messaging';

import { Content } from '../common/Content';
import { InfoTable } from '../common/InfoTable';
import { Link } from '../common/Link';
import { Nobr } from '../common/Nobr';
import tooltipDescs from '../common/TooltipDescriptions';

const { Title, Text } = Typography;

export function TxnMetadata({
  record,
}: {
  record: MessageRecord<TransactionMessage>;
}) {
  const { memo, metadata, expire, authorities } =
    record.message.transaction.header;
  if (!memo && !metadata && !expire?.atTime && !authorities?.length) {
    return null;
  }

  const labelDeadline = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.expireAtTime}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Deadline
      </Nobr>
    </span>
  );

  const labelAuthority = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.additionalAuthority}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Required signer
      </Nobr>
    </span>
  );

  const labelMemo = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.memo}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Memo
      </Nobr>
    </span>
  );
  const labelMetadata = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.metadata}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Metadata
      </Nobr>
    </span>
  );
  return (
    <>
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Transaction Metadata
      </Title>

      <InfoTable>
        {memo && (
          <Descriptions.Item label={labelMemo}>
            <Content type="ASCII">{memo}</Content>
          </Descriptions.Item>
        )}

        {metadata && (
          <Descriptions.Item label={labelMetadata}>
            <Content>{metadata}</Content>
          </Descriptions.Item>
        )}

        {expire?.atTime && (
          <Descriptions.Item label={labelDeadline}>
            <Text>{moment(expire.atTime).format('YYYY-MM-DD HH:mm:ss')}</Text>
          </Descriptions.Item>
        )}

        {authorities?.map((authority) => (
          <Descriptions.Item key={authority.toString()} label={labelAuthority}>
            <Link to={authority}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiAccountCircleLine />
              </IconContext.Provider>
              {authority.toString()}
            </Link>
          </Descriptions.Item>
        ))}
      </InfoTable>
    </>
  );
}
