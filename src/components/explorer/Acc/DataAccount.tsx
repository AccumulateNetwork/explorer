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
import { ParentDesc } from './ParentDesc';

const { Title, Paragraph, Text } = Typography;

export function DataAccount({ record }: { record: AccountRecord }) {
  const account = record.account as core.DataAccount | core.LiteDataAccount;

  return (
    <div>
      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label="Type">
          <EnumValue type={AccountType} value={account.type} />
        </Descriptions.Item>
      </Descriptions>

      <div>
        <Title level={4}>
          <IconContext.Provider value={{ className: 'react-icons' }}>
            <RiInformationLine />
          </IconContext.Provider>
          Data Account Info
        </Title>

        <Descriptions bordered column={1} size="middle" className="info-table">
          <Descriptions.Item
            label={
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
            }
          >
            {account.url.toString()}
          </Descriptions.Item>

          <ParentDesc account={account} />
        </Descriptions>

        <Authorities account={account} />

        <Title level={4} style={{ marginTop: 30 }}>
          <IconContext.Provider value={{ className: 'react-icons' }}>
            <RiKeynoteLine />
          </IconContext.Provider>
          Data Account State
        </Title>

        {account.type === AccountType.DataAccount &&
          (account.entry ? (
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
          ))}

        <DataLedger scope={account.url} />

        <AccChains account={account.url} />
      </div>
    </div>
  );
}

export default DataAccount;
