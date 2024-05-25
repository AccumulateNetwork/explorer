import {
  Alert,
  Button,
  Descriptions,
  List,
  Skeleton,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import moment from 'moment-timezone';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiExchangeLine,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { colorBrewer } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import Data from '../../common/Data';
import getTs from '../../common/GetTS';
import Key from '../../common/Key';
import wrapLinksInHtml from '../../common/LinksRenderer';
import tooltipDescs from '../../common/TooltipDescriptions';
import TxStatus from '../../common/TxStatus';

const { Title, Text } = Typography;

const GenericMsg = (props) => {
  const { message } = props.data;
  const utcOffset = moment().utcOffset() / 60;
  const [ts, setTs] = useState(null);
  const [block, setBlock] = useState(null);
  const [rawDataDisplay, setRawDataDisplay] = useState('none');
  const [showAllProduced, setShowAllProduced] = useState(false);

  const toggleRawData = (checked) => {
    checked === true ? setRawDataDisplay('block') : setRawDataDisplay('none');
  };

  let title = 'Message';
  let showMsgType = true;
  /* eslint-disable default-case */
  switch (props.data.message.type) {
    case 'signature':
      title = 'Signature';
      showMsgType = false;
      break;
    case 'creditPayment':
      title = 'Credit Payment';
      showMsgType = false;
      break;
    case 'signatureRequest':
      title = 'Signature Request';
      showMsgType = false;
      break;
  }
  /* eslint-enable default-case */

  let signature = props.data.message?.signature;
  let delegators = [];
  while (signature?.type === 'delegated') {
    delegators.push(signature.delegator);
    signature = signature.signature;
  }
  delegators.reverse();

  if (signature?.type === 'authority') {
    delegators = signature.delegator;
  }

  useEffect(() => {
    if (props.data.id) {
      let txId = props.data.id.replace(/^acc:\/\/|@.*$/g, '');
      getTs(txId, setTs, setBlock);
    }
  }, [props.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <TxStatus data={props.data} />

      {showMsgType && message.type && (
        <div>
          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Message Type
          </Title>
          <Descriptions bordered column={1} size="middle">
            <Descriptions.Item label="Type">{message.type}</Descriptions.Item>
          </Descriptions>
        </div>
      )}

      {props.data ? (
        <div>
          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            {title} Data
          </Title>

          <Descriptions bordered column={1} size="middle">
            {props.data.id && [
              <Descriptions.Item
                key="time"
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
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
              </Descriptions.Item>,

              <Descriptions.Item
                key="block"
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
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
              </Descriptions.Item>,

              <Descriptions.Item
                key="id"
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.msgId}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      ID
                    </nobr>
                  </span>
                }
              >
                <span>{props.data.id}</span>
              </Descriptions.Item>,
            ]}

            {(signature?.signer || signature?.origin) && (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.sigSignerUrl}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Signer
                    </nobr>
                  </span>
                }
              >
                {signature.type === 'authority' && (
                  <Tooltip
                    overlayClassName="explorer-tooltip"
                    title={tooltipDescs.authSig}
                  >
                    <Tag color="gray">Authority</Tag>
                  </Tooltip>
                )}
                {signature.vote === 'accept' && (
                  <Tooltip
                    overlayClassName="explorer-tooltip"
                    title={tooltipDescs.sigAccept}
                  >
                    <Tag color="green">Acceptance</Tag>
                  </Tooltip>
                )}
                {signature.vote === 'reject' && (
                  <Tooltip
                    overlayClassName="explorer-tooltip"
                    title={tooltipDescs.sigReject}
                  >
                    <Tag color="red">Rejection</Tag>
                  </Tooltip>
                )}
                {signature.vote === 'abstain' && (
                  <Tooltip
                    overlayClassName="explorer-tooltip"
                    title={tooltipDescs.sigAbstain}
                  >
                    <Tag color="yellow">Abstention</Tag>
                  </Tooltip>
                )}
                <Link
                  to={
                    '/acc/' +
                    (signature.signer || signature.origin).replace('acc://', '')
                  }
                >
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountCircleLine />
                  </IconContext.Provider>
                  {signature.signer || signature.origin}
                </Link>
              </Descriptions.Item>
            )}

            {signature?.publicKey && (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.publicKey}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Public Key
                    </nobr>
                  </span>
                }
              >
                <Key publicKey={signature.publicKey} type={signature.type} />
              </Descriptions.Item>
            )}

            {props.data.message?.txID && (
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
                      Transaction
                    </nobr>
                  </span>
                }
              >
                <Link
                  to={'/acc/' + props.data.message.txID.replace('acc://', '')}
                >
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiExchangeLine />
                  </IconContext.Provider>
                  {props.data.message.txID}
                </Link>
              </Descriptions.Item>
            )}

            {delegators?.length && (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.sigDelegators}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Delegators
                    </nobr>
                  </span>
                }
              >
                {delegators.map((delegator) => (
                  <div key={delegator}>
                    <Link
                      to={'/acc/' + delegator.replace('acc://', '')}
                      key={delegator}
                    >
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <RiAccountCircleLine />
                      </IconContext.Provider>
                      {delegator}
                    </Link>
                  </div>
                ))}
              </Descriptions.Item>
            )}

            {signature?.memo && (
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
                    __html: wrapLinksInHtml(signature.memo),
                  }}
                />
              </Descriptions.Item>
            )}

            {signature?.data && (
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
                <Data>{signature.data}</Data>
              </Descriptions.Item>
            )}

            {signature?.cause && (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.sigCause}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Cause
                    </nobr>
                  </span>
                }
              >
                <Link to={'/acc/' + signature.cause.replace('acc://', '')}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiExchangeLine />
                  </IconContext.Provider>
                  {signature.cause}
                </Link>
              </Descriptions.Item>
            )}

            {props.data.produced?.records?.length > 0 && (
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
                {props.data.produced.records
                  .slice(
                    0,
                    showAllProduced ? props.data.produced.records.length : 5,
                  )
                  .map(({ value }) => (
                    <List.Item key={value}>
                      <Link to={'/acc/' + value.replace('acc://', '')}>
                        <IconContext.Provider
                          value={{ className: 'react-icons' }}
                        >
                          <RiExchangeLine />
                        </IconContext.Provider>
                        {value}
                      </Link>
                    </List.Item>
                  ))}
                {props.data.produced.records.length > 5 && !showAllProduced && (
                  <List.Item key={'more'}>
                    <Button onClick={(e) => setShowAllProduced(true)}>
                      +{props.data.produced.records.length - 5} more
                    </Button>
                  </List.Item>
                )}
              </Descriptions.Item>
            )}
          </Descriptions>

          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Raw Data
            <Switch
              checkedChildren="ON"
              unCheckedChildren="OFF"
              style={{ marginTop: -5, marginLeft: 10 }}
              disabled={message ? false : true}
              onChange={toggleRawData}
            />
          </Title>

          {message ? (
            <div
              className="entry-content"
              style={{ marginTop: 0, display: rawDataDisplay }}
            >
              <SyntaxHighlighter style={colorBrewer} language="json">
                {JSON.stringify(message, null, 4)}
              </SyntaxHighlighter>
            </div>
          ) : (
            <Alert message="No message data" type="warning" showIcon />
          )}
        </div>
      ) : null}
    </div>
  );
};

export default GenericMsg;
