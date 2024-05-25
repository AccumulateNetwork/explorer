import { Alert, Descriptions, List, Skeleton, Tooltip, Typography } from 'antd';
import moment from 'moment-timezone';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiExchangeLine,
  RiFileList2Line,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';

import Data from '../../common/Data';
import getTs from '../../common/GetTS';
import tooltipDescs from '../../common/TooltipDescriptions';

const { Title, Text } = Typography;

const DataEntry = (props) => {
  const entry = props.data;
  const utcOffset = moment().utcOffset() / 60;

  var content = [];
  if (
    props.data &&
    props.data.data &&
    props.data.data.entry &&
    props.data.data.entry.data
  ) {
    if (Array.isArray(props.data.data.entry.data)) {
      content = Array.from(props.data.data.entry.data, (item) => item || '');
    } else {
      content.push(props.data.data.entry.data);
    }
  }

  const [ts, setTs] = useState(null);
  const [block, setBlock] = useState(null);

  useEffect(() => {
    let txId = props.data.data.txId.replace(/^acc:\/\/|@.*$/g, '');
    getTs(
      txId,
      setTs,
      setBlock,
      (x) => x.chain === 'main' || x.chain === 'scratch',
    );
  }, [props.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <Descriptions bordered column={1} size="middle">
        {entry.type ? (
          <Descriptions.Item label="Type">{entry.type}</Descriptions.Item>
        ) : null}
      </Descriptions>

      {entry.data ? (
        <div>
          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Entry Info
          </Title>
          <Descriptions bordered column={1} size="middle">
            <Descriptions.Item
              label={
                <span>
                  <nobr>
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
                  </nobr>
                </span>
              }
            >
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
            </Descriptions.Item>

            <Descriptions.Item
              label={
                <span>
                  <nobr>
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                      <Tooltip
                        overlayClassName="explorer-tooltip"
                        title={tooltipDescs.block}
                      >
                        <RiQuestionLine />
                      </Tooltip>
                    </IconContext.Provider>
                    Block
                  </nobr>
                </span>
              }
            >
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
            </Descriptions.Item>

            {entry.data.entryHash ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.entryHash}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Entry Hash
                    </nobr>
                  </span>
                }
              >
                {entry.data.entryHash}
              </Descriptions.Item>
            ) : null}

            {entry.account ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.dataAccount}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Data Account
                    </nobr>
                  </span>
                }
              >
                <Link to={'/acc/' + entry.account.replace('acc://', '')}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountCircleLine />
                  </IconContext.Provider>
                  {entry.account}
                </Link>
              </Descriptions.Item>
            ) : null}

            {entry.data.txId ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.txId}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Txid
                    </nobr>
                  </span>
                }
              >
                <Link to={'/acc/' + entry.data.txId.replace('acc://', '')}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiExchangeLine />
                  </IconContext.Provider>
                  {entry.data.txId}
                </Link>
              </Descriptions.Item>
            ) : null}

            {entry.data.causeTxId ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.causeTxId}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Cause
                    </nobr>
                  </span>
                }
              >
                <Link to={'/acc/' + entry.data.causeTxId.replace('acc://', '')}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiExchangeLine />
                  </IconContext.Provider>
                  {entry.data.causeTxId}
                </Link>
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiFileList2Line />
            </IconContext.Provider>
            Entry Data
          </Title>

          {content ? (
            <List
              size="small"
              bordered
              dataSource={content}
              renderItem={(item) => (
                <List.Item>
                  <Data>{item}</Data>
                </List.Item>
              )}
              style={{ marginBottom: '30px' }}
            />
          ) : (
            <div class="skeleton-holder">
              <Alert message="No content" type="info" showIcon />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default DataEntry;
