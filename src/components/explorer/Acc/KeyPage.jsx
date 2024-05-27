import { Descriptions, List, Tag, Tooltip, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountBoxLine,
  RiAccountCircleLine,
  RiCloseCircleLine,
  RiInformationLine,
  RiKey2Line,
  RiQuestionLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';

import Count from '../../common/Count';
import Key from '../../common/Key';
import tooltipDescs from '../../common/TooltipDescriptions';
import { AccChains } from './AccChains';

const { Title, Paragraph, Text } = Typography;

const KeyPage = (props) => {
  const keypage = props.data;

  return (
    <div>
      <Descriptions bordered column={1} size="middle">
        {keypage.recordType ? (
          <Descriptions.Item label="Type">
            {keypage.recordType}
          </Descriptions.Item>
        ) : null}
      </Descriptions>

      {keypage.account ? (
        <div>
          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Key Page Info
          </Title>
          <Descriptions bordered column={1} size="middle">
            {keypage.account.url ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.keyPageUrl}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Key Page URL
                    </nobr>
                  </span>
                }
              >
                {keypage.account.url}
              </Descriptions.Item>
            ) : null}

            {keypage.adi ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.adiUrl}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      ADI
                    </nobr>
                  </span>
                }
              >
                <Link to={'/acc/' + keypage.adi.replace('acc://', '')}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountCircleLine />
                  </IconContext.Provider>
                  {keypage.adi}
                </Link>
              </Descriptions.Item>
            ) : null}

            {keypage.account.keyBook ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.keyBook}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Key Book
                    </nobr>
                  </span>
                }
              >
                <Link
                  to={'/acc/' + keypage.account.keyBook.replace('acc://', '')}
                >
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountBoxLine />
                  </IconContext.Provider>
                  {keypage.account.keyBook}
                </Link>
              </Descriptions.Item>
            ) : null}

            {keypage.account.threshold ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.threshold}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Threshold
                    </nobr>
                  </span>
                }
              >
                {keypage.account.threshold}
              </Descriptions.Item>
            ) : null}

            <Descriptions.Item
              label={
                <span>
                  <nobr>
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                      <Tooltip
                        overlayClassName="explorer-tooltip"
                        title={tooltipDescs.creditBalance}
                      >
                        <RiQuestionLine />
                      </Tooltip>
                    </IconContext.Provider>
                    Credit Balance
                  </nobr>
                </span>
              }
            >
              {keypage.account.creditBalance
                ? keypage.account.creditBalance / 100
                : 0}{' '}
              credits
            </Descriptions.Item>
          </Descriptions>

          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiKey2Line />
            </IconContext.Provider>
            Keys
            <Count
              count={
                keypage.account.keys &&
                (keypage.account.keys[0].publicKey ||
                  keypage.account.keys[0].delegate)
                  ? keypage.account.keys.length
                  : 0
              }
            />
          </Title>

          {keypage.account.keys &&
          (keypage.account.keys[0].publicKey ||
            keypage.account.keys[0].delegate) ? (
            <List
              size="small"
              bordered
              dataSource={keypage.account.keys}
              renderItem={(item) => (
                <List.Item>
                  <span>
                    {item.delegate ? (
                      <span>
                        <Tag color="green">Delegate</Tag>
                        <Link
                          to={'/acc/' + item.delegate.replace('acc://', '')}
                        >
                          <IconContext.Provider
                            value={{ className: 'react-icons' }}
                          >
                            <RiAccountBoxLine />
                          </IconContext.Provider>
                          {item.delegate}
                        </Link>
                      </span>
                    ) : null}
                    {item.delegate && item.publicKey ? <p></p> : null}
                    {item.publicKey ? <Key keyHash={item.publicKey} /> : null}
                  </span>
                </List.Item>
              )}
              style={{ marginBottom: '30px' }}
            />
          ) : (
            <Paragraph>
              <Text type="secondary">No keys</Text>
            </Paragraph>
          )}

          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiCloseCircleLine />
            </IconContext.Provider>
            Transaction Blacklist
            <Count
              count={
                keypage.account.transactionBlacklist
                  ? keypage.account.transactionBlacklist.length
                  : 0
              }
            />
          </Title>

          {keypage.account.transactionBlacklist &&
          keypage.account.transactionBlacklist[0] ? (
            <List
              size="small"
              bordered
              dataSource={keypage.account.transactionBlacklist}
              renderItem={(item) => (
                <List.Item>
                  <Tag color="volcano">{item}</Tag>
                </List.Item>
              )}
              style={{ marginBottom: '30px' }}
            />
          ) : (
            <Paragraph>
              <Text type="secondary">No transaction blacklist</Text>
            </Paragraph>
          )}

          <AccChains account={keypage.account.url} />
        </div>
      ) : null}
    </div>
  );
};

export default KeyPage;
