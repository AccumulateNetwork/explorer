import { Descriptions, Skeleton, Tooltip, Typography, message } from 'antd';
import axios from 'axios';
import moment from 'moment';
import { useContext, useState } from 'react';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiQuestionLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';

import { TxID, URL } from 'accumulate.js';

import tooltipDescs from '../../utils/lang';
import { Network } from '../common/Network';
import { Nobr } from '../common/Nobr';
import { useAsyncEffect } from '../common/useAsync';

const { Text } = Typography;

export function describeTimestamp(txid: string | URL | TxID) {
  const utcOffset = moment().utcOffset() / 60;
  const { network } = useContext(Network);

  const [ts, setTs] = useState(null);
  const [block, setBlock] = useState(null);

  useAsyncEffect(
    async (mounted) => {
      setTs(null);
      setBlock(null);
      let txId = `${txid}`.replace(/^acc:\/\/|@.*$/g, '');

      // Use metrics service if available for caching, otherwise fall back to direct API
      const timestampUrl = network.metrics
        ? `${network.metrics}/timestamp/${txId}`
        : `${network.api[0]}/timestamp/${txId}@unknown`;

      const response = await axios
        .get(timestampUrl)
        .catch((error) => {
          setTs(0);
          setBlock(0);
          if (!`${error}`.includes('404')) {
            // Silently fail - timestamps are often unavailable
            console.warn('Failed to fetch timestamp:', error.message);
          }
          return null;
        });
      if (!mounted()) {
        return;
      }
      if (!response?.data) {
        setTs(0);
        setBlock(0);
        return;
      }

      const entries = (response.data.chains || [])
        // // Filter by chain
        // .filter((x) => x.chain === 'main' || x.chain === 'scratch')
        // Sort by age ascending
        .sort((a, b) => b.block - a.block);

      // Use the youngest entry
      if (entries.length && entries[0].time) {
        setTs(entries[0].time);
        setBlock(entries[0].block || 0); // block can be 0 for signature timestamps
      } else {
        setTs(0);
        setBlock(0);
      }
    },
    [`${txid}`],
  );

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
