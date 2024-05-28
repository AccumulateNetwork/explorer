import { Descriptions, List, Tooltip, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine, RiQuestionLine, RiStackLine } from 'react-icons/ri';

import { core } from 'accumulate.js';
import { AccountRecord } from 'accumulate.js/lib/api_v3';
import { AccountType } from 'accumulate.js/lib/core';

import { AccTitle } from '../../common/AccTitle';
import Count from '../../common/Count';
import { EnumValue } from '../../common/EnumValue';
import { Link } from '../../common/Link';
import { Nobr } from '../../common/Nobr';
import tooltipDescs from '../../common/TooltipDescriptions';
import { AccChains } from './AccChains';
import Authorities from './Authorities';
import { describeParent } from './parent';

const { Title, Paragraph, Text } = Typography;

export function KeyBook({ record }: { record: AccountRecord }) {
  if (!(record.account instanceof core.KeyBook))
    throw new Error('Wrong account type for component');
  const { account } = record;

  const pages = [...Array(account.pageCount).keys()].map((x) =>
    account.url.join(`${x + 1}`),
  );

  const labelURL = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.keyBookUrl}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Key Book URL
      </Nobr>
    </span>
  );
  return (
    <div>
      <AccTitle title="Account" url={account.url} />

      {/* Account type */}
      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label="Type">
          <EnumValue type={AccountType} value={account.type} />
        </Descriptions.Item>
      </Descriptions>

      {/* General info like the URL and ADI */}
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Key Book Info
      </Title>

      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label={labelURL}>
          {account.url.toString()}
        </Descriptions.Item>

        {describeParent(account)}
      </Descriptions>

      {/* Authorities (may be inherited) */}
      <Authorities account={account} />

      {/* Key pages */}
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiStackLine />
        </IconContext.Provider>
        Key Pages
        <Count count={account.pageCount} />
      </Title>

      {account.pageCount ? (
        <List
          size="small"
          bordered
          dataSource={pages}
          renderItem={(item) => (
            <List.Item>
              <Link to={item}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiStackLine />
                </IconContext.Provider>
                {item.toString()}
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

      {/* Chains and pending transactions */}
      <AccChains account={account.url} />
    </div>
  );
}
