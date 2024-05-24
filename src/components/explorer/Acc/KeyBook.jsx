import React from 'react';

import { Link } from 'react-router-dom';

import { Typography, Descriptions, Tooltip, List } from 'antd';

import { IconContext } from 'react-icons';
import {
  RiInformationLine,
  RiQuestionLine,
  RiStackLine,
  RiAccountCircleLine,
} from 'react-icons/ri';

import Count from '../../common/Count';
import tooltipDescs from '../../common/TooltipDescriptions';
import TxChain from '../../common/TxChain';
import Authorities from '../../common/Authorities';

const { Title, Paragraph, Text } = Typography;

const KeyBook = (props) => {
  const keybook = props.data;
  if (!keybook.account.pages && keybook.account.pageCount) {
    var pages = [];
    for (var i = 1; i <= keybook.account.pageCount; i++) {
      pages.push(keybook.account.url + '/' + i);
    }
    keybook.account.pages = pages;
  }

  return (
    <div>
      <Descriptions bordered column={1} size="middle">
        {keybook.recordType ? (
          <Descriptions.Item label="Type">
            {keybook.recordType}
          </Descriptions.Item>
        ) : null}
      </Descriptions>

      {keybook.account ? (
        <div>
          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Key Book Info
          </Title>
          <Descriptions bordered column={1} size="middle">
            {keybook.account.url ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.keyBookUrl}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Key Book URL
                    </nobr>
                  </span>
                }
              >
                {keybook.account.url}
              </Descriptions.Item>
            ) : null}

            {keybook.adi ? (
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
                <Link to={'/acc/' + keybook.adi.replace('acc://', '')}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountCircleLine />
                  </IconContext.Provider>
                  {keybook.adi}
                </Link>
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          <Authorities items={keybook.account.authorities} />

          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiStackLine />
            </IconContext.Provider>
            Key Pages
            <Count
              count={
                keybook.account.pages && keybook.account.pages[0]
                  ? keybook.account.pages.length
                  : 0
              }
            />
          </Title>

          {keybook.account.pages && keybook.account.pages[0] ? (
            <List
              size="small"
              bordered
              dataSource={keybook.account.pages}
              renderItem={(item) => (
                <List.Item>
                  <Link to={'/acc/' + item.replace('acc://', '')}>
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                      <RiStackLine />
                    </IconContext.Provider>
                    {item}
                  </Link>
                </List.Item>
              )}
              style={{ marginBottom: '30px' }}
            />
          ) : (
            <Paragraph>
              <Text type="secondary">No pages</Text>
            </Paragraph>
          )}

          <TxChain url={keybook.account.url} type="transaction" />
          <TxChain url={keybook.account.url} type="pending" />
          <TxChain url={keybook.account.url} type="signature" />
        </div>
      ) : null}
    </div>
  );
};

export default KeyBook;
