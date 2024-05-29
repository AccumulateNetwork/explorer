import { Descriptions, Skeleton, Tooltip, Typography } from 'antd';
import moment from 'moment';
import { useEffect, useState } from 'react';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiQuestionLine } from 'react-icons/ri';

import { TxID, URL } from 'accumulate.js';

import getTs from '../../utils/getTS';
import { Link } from '../common/Link';
import { Nobr } from '../common/Nobr';
import tooltipDescs from '../common/TooltipDescriptions';

const { Text } = Typography;

export function describeTimestamp(txid: string | URL | TxID) {
  const utcOffset = moment().utcOffset() / 60;

  const [ts, setTs] = useState(null);
  const [block, setBlock] = useState(null);

  const labelTimestamp = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.timestamp}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Timestamp (UTC{utcOffset < 0 ? '-' : '+'}
        {utcOffset})
      </Nobr>
    </span>
  );

  const labelBlock = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.block}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Block
      </Nobr>
    </span>
  );

  useEffect(() => {
    let txId = `${txid}`.replace(/^acc:\/\/|@.*$/g, '');
    getTs(
      txId,
      setTs,
      setBlock,
      (x) => x.chain === 'main' || x.chain === 'scratch',
    );
  }, [`${txid}`]);

  return [
    <Descriptions.Item key="timestamp" label={labelTimestamp}>
      {ts || ts === 0 ? (
        <Text>
          {ts ? (
            <Text className="code">
              {moment(ts).format('YYYY-MM-DD HH:mm:ss')}
            </Text>
          ) : (
            <Text disabled>N/A</Text>
          )}
        </Text>
      ) : (
        <Skeleton
          className={'skeleton-singleline'}
          active
          title={true}
          paragraph={false}
        />
      )}
    </Descriptions.Item>,

    <Descriptions.Item key="block" label={labelBlock}>
      {block || block === 0 ? (
        <Text>
          {block ? (
            <Link className="code" to={'/block/' + block}>
              {block}
            </Link>
          ) : (
            <Text disabled>N/A</Text>
          )}
        </Text>
      ) : (
        <Skeleton
          className={'skeleton-singleline'}
          active
          title={true}
          paragraph={false}
        />
      )}
    </Descriptions.Item>,
  ];
}
