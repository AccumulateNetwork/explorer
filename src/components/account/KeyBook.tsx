import { Descriptions, List, Tooltip, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine, RiQuestionLine, RiStackLine } from 'react-icons/ri';

import { core } from 'accumulate.js';
import { AccountType } from 'accumulate.js/lib/core';

import { tooltip } from '../../utils/lang';
import { AccountRecordOf } from '../../utils/types';
import { AccTitle } from '../common/AccTitle';
import Count from '../common/Count';
import { EnumValue } from '../common/EnumValue';
import { InfoTable } from '../common/InfoTable';
import { Link } from '../common/Link';
import { Nobr } from '../common/Nobr';
import { AccChains } from './AccChains';
import Authorities from './Authorities';
import { describeParent } from './parent';

const { Title, Paragraph, Text } = Typography;

export function KeyBook({ record }: { record: AccountRecordOf<core.KeyBook> }) {
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
            title={tooltip.keyBookUrl}
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
      <AccTitle url={account.url} linkable={account} title="Key Book" />

      {/* Account type */}
      <InfoTable>
        <Descriptions.Item label="Type">
          <EnumValue type={AccountType} value={account.type} />
        </Descriptions.Item>
      </InfoTable>

      {/* General info like the URL and ADI */}
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Key Book Info
      </Title>

      <InfoTable>
        <Descriptions.Item label={labelURL}>
          {account.url.toString()}
        </Descriptions.Item>

        {describeParent(account)}
      </InfoTable>

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
