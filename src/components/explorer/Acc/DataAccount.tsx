import { Descriptions, List, Tooltip, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import {
  RiInformationLine,
  RiKeynoteLine,
  RiQuestionLine,
} from 'react-icons/ri';

import { core } from 'accumulate.js';
import { AccountRecord } from 'accumulate.js/lib/api_v3';
import { AccountType } from 'accumulate.js/lib/core';

import { dataEntryParts } from '../../../utils/data';
import { EnumValue } from '../../common/EnumValue';
import ExtId from '../../common/ExtId';
import { Nobr } from '../../common/Nobr';
import tooltipDescs from '../../common/TooltipDescriptions';
import { AccChains } from './AccChains';
import Authorities from './Authorities';
import { DataLedger } from './DataLedger';
import { describeParent } from './parent';

const { Title, Paragraph, Text } = Typography;

export function DataAccount({ record }: { record: AccountRecord }) {
  if (
    !(record.account instanceof core.DataAccount) &&
    !(record.account instanceof core.LiteDataAccount)
  )
    throw new Error('Wrong account type for component');
  const { account } = record;

  const labelURL = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.dataAccountUrl}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Data Account URL
      </Nobr>
    </span>
  );

  return (
    <div>
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
        Data Account Info
      </Title>

      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label={labelURL}>
          {account.url.toString()}
        </Descriptions.Item>

        {describeParent(account)}
      </Descriptions>

      {/* Authorities (may be inherited) */}
      <Authorities account={account} />

      {/* Account state data entry (ADI data account only) */}
      {account.type === AccountType.DataAccount && (
        <div>
          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiKeynoteLine />
            </IconContext.Provider>
            Data Account State
          </Title>

          {account.entry ? (
            <List
              size="small"
              bordered
              dataSource={dataEntryParts(account.entry)}
              renderItem={(item) => (
                <List.Item>
                  <ExtId>{item}</ExtId>
                </List.Item>
              )}
              style={{ marginBottom: '30px' }}
            />
          ) : (
            <Paragraph>
              <Text type="secondary">Empty state</Text>
            </Paragraph>
          )}
        </div>
      )}

      {/* Data entries */}
      <DataLedger scope={account.url} />

      {/* Chains and pending transactions */}
      <AccChains account={account.url} />
    </div>
  );
}
