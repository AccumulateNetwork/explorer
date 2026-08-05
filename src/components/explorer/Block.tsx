import { Alert, Descriptions, Skeleton, Switch, Tag, Typography } from 'antd';
import moment from 'moment-timezone';
import React, { useContext, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiExchangeLine, RiInformationLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { colorBrewer } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import getBlockEntries from '../../utils/getBlockEntries';
import { extractTxType } from '../../utils/message';
import { utcOffsetLabel } from '../../utils/time';
import Count from '../common/Count';
import { InfiniteTable } from '../common/InfiniteList';
import { InfoTable } from '../common/InfoTable';
import { Network } from '../common/Network';
import { useAsyncEffect } from '../common/useAsync';
import Error404 from './Error404';

const { Title, Text } = Typography;

interface BlockMessage {
  value?: {
    id?: string;
    message?: { type?: string };
  };
  txid?: string;
}

function shortHash(id: string | undefined): string {
  if (!id) return 'unknown';
  const hex = id.replace(/^acc:\/\//, '').replace(/^.*@/, '');
  return hex.slice(0, 8) || 'unknown';
}

function splitAcc(id: string | undefined): { adi?: string; path?: string } {
  if (!id) return {};
  const m = id.match(/^acc:\/\/([^@]+)/);
  if (!m) return {};
  const [adi, ...rest] = m[1].split('/');
  return { adi, path: rest.join('/') };
}

function formatTime(t: Date | string | undefined): string | undefined {
  if (!t) return undefined;
  return moment(t).format('HH:mm:ss');
}

const Block = () => {
  const [block, setBlock] = useState(null);
  const [notFound] = useState(false);
  const [error, setError] = useState(null);
  const [rawDataDisplay, setRawDataDisplay] = useState('none');

  const utcOffsetString = utcOffsetLabel(moment().utcOffset());

  const toggleRawData = (checked) => {
    checked === true ? setRawDataDisplay('block') : setRawDataDisplay('none');
  };

  const columns = [
    {
      title: 'Transaction',
      render: (row: BlockMessage) => {
        if (!row) {
          return <Text disabled>N/A</Text>;
        }
        const id = row.value?.id;
        const type = row.value?.message?.type || extractTxType(row.value);
        const { adi, path } = splitAcc(id);
        const timestamp = formatTime((row.value as any)?.lastBlockTime);
        const pathSuffix = path ? `/${path}` : '';
        const label = type
          ? `${type} · ${adi ?? 'unknown'}${pathSuffix}${
              timestamp ? ` @ ${timestamp}` : ''
            }`
          : `${shortHash(id)} · unknown`;
        const to = id ? '/acc/' + id.replace('acc://', '') : '#';
        return (
          <Link to={to} style={{ display: 'block' }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiExchangeLine />
            </IconContext.Provider>
            {label}
          </Link>
        );
      },
    },
    {
      title: 'Type',
      render: (row: BlockMessage) => {
        const type = row?.value?.message?.type || extractTxType(row?.value);
        if (type) {
          return <Tag color="green">{type}</Tag>;
        }
        return <Text disabled>N/A</Text>;
      },
    },
  ];

  const { api, network } = useContext(Network);
  const { index } = useParams<{ index: string }>();
  useAsyncEffect(
    async (mounted) => {
      document.title = 'Minor block #' + index + ' | Accumulate Explorer';
      setError(null);

      const r = await api.query('dn.acme', {
        queryType: 'block',
        minor: parseInt(index),
      });
      if (!mounted()) {
        return;
      }
      setBlock({
        ...r.asObject(),
        messages: getBlockEntries(r).map((e) => e.asObject()),
      });
    },
    [index, network.id],
  ).catch((error) => setError(`${error}`));

  if (notFound) {
    return <Error404 />;
  }

  return (
    <div>
      <Title level={2}>Minor Block #{index}</Title>
      {block ? (
        <div>
          <InfoTable>
            <Descriptions.Item label={`Timestamp (UTC${utcOffsetString})`}>
              {block.time ? (
                <Text className="code">
                  {moment(block.time).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              ) : (
                <Text disabled>Timestamp not recorded</Text>
              )}
            </Descriptions.Item>
          </InfoTable>

          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiExchangeLine />
            </IconContext.Provider>
            Transactions
            <Count count={block.messages ? block.messages.length : 0} />
          </Title>

          {block.messages && block.messages.length ? (
            <InfiniteTable<BlockMessage>
              className="block-messages-table"
              dataSource={block.messages}
              columns={columns}
              rowKey={(row: BlockMessage, idx) =>
                row?.value?.id || row?.txid || `i-${idx}`
              }
            />
          ) : (
            <Alert
              message="This block is empty"
              type="info"
              showIcon
              style={{ marginBottom: 30 }}
            />
          )}

          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Raw Data
            <Switch
              checkedChildren="ON"
              unCheckedChildren="OFF"
              style={{ marginTop: -5, marginLeft: 10 }}
              disabled={block ? false : true}
              onChange={toggleRawData}
            />
          </Title>

          <div
            className="entry-content"
            style={{ marginTop: 0, display: rawDataDisplay }}
          >
            <SyntaxHighlighter style={colorBrewer} language="json">
              {JSON.stringify(block, null, 4)}
            </SyntaxHighlighter>
          </div>
        </div>
      ) : (
        <div>
          {error ? (
            <div className="skeleton-holder">
              <Alert message={error} type="error" showIcon />
            </div>
          ) : (
            <div className="skeleton-holder">
              <Skeleton active />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Block;
