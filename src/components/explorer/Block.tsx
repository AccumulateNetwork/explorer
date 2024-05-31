import {
  Alert,
  Descriptions,
  Skeleton,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import moment from 'moment-timezone';
import React, { useContext, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiExchangeLine, RiInformationLine } from 'react-icons/ri';
import { Link, useParams } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { colorBrewer } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import getBlockEntries from '../../utils/getBlockEntries';
import Count from '../common/Count';
import { Shared } from '../common/Shared';
import { useAsyncEffect } from '../common/useAsync';
import Error404 from './Error404';

const { Title, Text } = Typography;

const Block = () => {
  const pagination = {
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    current: 1,
  };
  const [block, setBlock] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [rawDataDisplay, setRawDataDisplay] = useState('none');

  let utcOffset = moment().utcOffset() / 60;
  let utcOffsetString = utcOffset < 0 ? '-' : '+' + utcOffset;

  const toggleRawData = (checked) => {
    checked === true ? setRawDataDisplay('block') : setRawDataDisplay('none');
  };

  const columns = [
    {
      title: 'Transaction ID',
      render: (row) => {
        if (row) {
          return (
            <div>
              <Link to={'/acc/' + row.value.id.replace('acc://', '')}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiExchangeLine />
                </IconContext.Provider>
                {row.value.id}
              </Link>
            </div>
          );
        } else {
          return <Text disabled>N/A</Text>;
        }
      },
    },
    {
      title: 'Type',
      render: (row) => {
        if (row) {
          return <Tag color="green">{row.value.message.type}</Tag>;
        } else {
          return <Text disabled>N/A</Text>;
        }
      },
    },
  ];

  const { api, network } = useContext(Shared);
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
          <Descriptions bordered column={1} size="middle">
            <Descriptions.Item label={`Timestamp (UTC${utcOffsetString})`}>
              {block.time ? (
                <Text className="code">
                  {moment(block.time).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              ) : (
                <Text disabled>Timestamp not recorded</Text>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiExchangeLine />
            </IconContext.Provider>
            Transactions
            <Count count={block.messages ? block.messages.length : 0} />
          </Title>

          {block.messages ? (
            <Table
              dataSource={block.messages}
              columns={columns}
              pagination={pagination}
              rowKey="txid"
              scroll={{ x: 'max-content' }}
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
