import {
  Alert,
  Descriptions,
  List,
  Skeleton,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { Button } from 'antd';
import moment from 'moment-timezone';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiExchangeLine,
  RiFileList2Line,
  RiInformationLine,
  RiQuestionLine,
  RiRefund2Fill,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { colorBrewer } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import Data from '../../common/Data';
import getTs from '../../common/GetTS';
import wrapLinksInHtml from '../../common/LinksRenderer';
import Signatures from '../../common/Signatures';
import tooltipDescs from '../../common/TooltipDescriptions';
import TxAddCredits from '../../common/TxAddCredits';
import TxIssueTokens from '../../common/TxIssueTokens';
import TxSendTokens from '../../common/TxSendTokens';
import TxStatus from '../../common/TxStatus';
import TxSyntheticDepositTokens from '../../common/TxSyntheticDepositTokens';
import TxUpdateAccountAuth from '../../common/TxUpdateAccountAuth';
import TxUpdateKeyPage from '../../common/TxUpdateKeyPage';

const { Title, Text, Paragraph } = Typography;

const GenericTx = (props) => {
  const tx = props.data;
  var content = [];
  if (tx?.message?.transaction?.body?.entry?.data) {
    if (Array.isArray(tx.message.transaction.body.entry.data)) {
      content = Array.from(
        tx.message.transaction.body.entry.data,
        (item) => item || '',
      );
    } else {
      content.push(tx.message.transaction.body.entry.data);
    }
  }

  const [ts, setTs] = useState(null);
  const [block, setBlock] = useState(null);
  const [rawDataDisplay, setRawDataDisplay] = useState('none');
  const [showAllProduced, setShowAllProduced] = useState(false);

  let utcOffset = moment().utcOffset() / 60;

  const toggleRawData = (checked) => {
    checked === true ? setRawDataDisplay('block') : setRawDataDisplay('none');
  };

  useEffect(() => {
    getTs(
      tx.transactionHash,
      setTs,
      setBlock,
      (x) => x.chain === 'main' || x.chain === 'scratch',
    );
  }, [tx]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <TxStatus data={tx} />

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Transaction Type
      </Title>
      <Descriptions bordered column={1} size="middle">
        {tx?.message?.transaction?.body?.type ? (
          <Descriptions.Item label="Type">
            {tx.message.transaction.body.type}
            {tx.message.transaction.body.isRefund && (
              <Tag
                color="orange"
                style={{ marginLeft: 10, textTransform: 'uppercase' }}
              >
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiRefund2Fill />
                </IconContext.Provider>
                Refund
              </Tag>
            )}
          </Descriptions.Item>
        ) : null}
      </Descriptions>

      {tx ? (
        <div>
          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Transaction Info
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

            {tx.id ? (
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
                <Text copyable>{tx.id}</Text>
              </Descriptions.Item>
            ) : null}

            {tx.transactionHash ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.txHash}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      TxHash
                    </nobr>
                  </span>
                }
              >
                <Text copyable className={'code'}>
                  {tx.transactionHash}
                </Text>
              </Descriptions.Item>
            ) : null}
            {tx.message.transaction.header.principal ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.sponsor}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Principal
                    </nobr>
                  </span>
                }
              >
                <Link
                  to={
                    '/acc/' +
                    tx.message.transaction.header.principal.replace(
                      'acc://',
                      '',
                    )
                  }
                >
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountCircleLine />
                  </IconContext.Provider>
                  {tx.message.transaction.header.principal}
                </Link>
              </Descriptions.Item>
            ) : null}

            {tx.message.transaction.header.expire?.atTime && (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.expireAtTime}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Deadline
                    </nobr>
                  </span>
                }
              >
                <Text>
                  {moment(tx.message.transaction.header.expire.atTime).format(
                    'YYYY-MM-DD HH:mm:ss',
                  )}
                </Text>
              </Descriptions.Item>
            )}

            {tx.message.transaction.header.authorities?.map((authority) => (
              <Descriptions.Item
                key={authority}
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.additionalAuthority}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Required signer
                    </nobr>
                  </span>
                }
              >
                <Link to={'/acc/' + authority.replace('acc://', '')}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountCircleLine />
                  </IconContext.Provider>
                  {authority}
                </Link>
              </Descriptions.Item>
            ))}

            {tx.produced?.records?.length > 0 ? (
              <Descriptions.Item
                className={'align-top has-list'}
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.produced}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Produced
                    </nobr>
                  </span>
                }
              >
                {tx.produced.records
                  .slice(0, showAllProduced ? tx.produced.records.length : 5)
                  .map((item) => (
                    <List.Item key={item.value}>
                      <Link to={'/acc/' + item.value.replace('acc://', '')}>
                        <IconContext.Provider
                          value={{ className: 'react-icons' }}
                        >
                          <RiExchangeLine />
                        </IconContext.Provider>
                        {item.value}
                      </Link>
                    </List.Item>
                  ))}
                {tx.produced.records.length > 5 && !showAllProduced && (
                  <List.Item key={'more'}>
                    <Button onClick={(e) => setShowAllProduced(true)}>
                      +{tx.produced.records.length - 5} more
                    </Button>
                  </List.Item>
                )}
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiFileList2Line />
            </IconContext.Provider>
            Entry Data
          </Title>

          {content && content.length > 0 ? (
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
            <Paragraph>
              <Text type="secondary">No entry data</Text>
            </Paragraph>
          )}

          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Transaction Metadata
          </Title>

          {tx.message.transaction &&
          tx.message.transaction.header &&
          (tx.message.transaction.header.memo ||
            tx.message.transaction.header.metadata) ? (
            <Descriptions bordered column={1} size="middle" layout="vertical">
              {tx.message.transaction &&
              tx.message.transaction.header &&
              tx.message.transaction.header.memo ? (
                <Descriptions.Item
                  label={
                    <span>
                      <nobr>
                        <IconContext.Provider
                          value={{ className: 'react-icons' }}
                        >
                          <Tooltip
                            overlayClassName="explorer-tooltip"
                            title={tooltipDescs.memo}
                          >
                            <RiQuestionLine />
                          </Tooltip>
                        </IconContext.Provider>
                        Memo
                      </nobr>
                    </span>
                  }
                >
                  <div
                    className="span ant-typography"
                    dangerouslySetInnerHTML={{
                      __html: wrapLinksInHtml(
                        tx.message.transaction.header.memo,
                      ),
                    }}
                  />
                </Descriptions.Item>
              ) : null}
              {tx.message.transaction &&
              tx.message.transaction.header &&
              tx.message.transaction.header.metadata ? (
                <Descriptions.Item
                  label={
                    <span>
                      <nobr>
                        <IconContext.Provider
                          value={{ className: 'react-icons' }}
                        >
                          <Tooltip
                            overlayClassName="explorer-tooltip"
                            title={tooltipDescs.metadata}
                          >
                            <RiQuestionLine />
                          </Tooltip>
                        </IconContext.Provider>
                        Metadata
                      </nobr>
                    </span>
                  }
                >
                  <Data>{tx.message.transaction.header.metadata}</Data>
                </Descriptions.Item>
              ) : null}
            </Descriptions>
          ) : (
            <Paragraph>
              <Text type="secondary">No metadata</Text>
            </Paragraph>
          )}

          {tx?.message?.transaction?.body?.type === 'sendTokens' && (
            <TxSendTokens data={tx} />
          )}

          {tx?.message?.transaction?.body?.type === 'issueTokens' && (
            <TxIssueTokens data={tx} />
          )}

          {tx?.message?.transaction?.body?.type === 'updateKeyPage' && (
            <TxUpdateKeyPage data={tx} />
          )}

          {tx?.message?.transaction?.body?.type === 'updateAccountAuth' && (
            <TxUpdateAccountAuth data={tx} />
          )}

          {tx?.message?.transaction?.body?.type ===
            'syntheticDepositTokens' && <TxSyntheticDepositTokens data={tx} />}

          {tx?.message?.transaction?.body?.type === 'addCredits' && (
            <TxAddCredits data={tx} />
          )}

          {tx.signatures?.records?.length > 0 && tx.message?.transaction && (
            <Signatures
              transaction={tx.message.transaction}
              data={tx.signatures.records}
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
              disabled={tx ? false : true}
              onChange={toggleRawData}
            />
          </Title>

          {tx ? (
            <div
              className="entry-content"
              style={{ marginTop: 0, display: rawDataDisplay }}
            >
              <SyntaxHighlighter style={colorBrewer} language="json">
                {JSON.stringify(tx, null, 4)}
              </SyntaxHighlighter>
            </div>
          ) : (
            <Alert message="No tx data" type="warning" showIcon />
          )}
        </div>
      ) : null}
    </div>
  );
};

export default GenericTx;
