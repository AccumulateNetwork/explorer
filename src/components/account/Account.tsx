import { Descriptions, Tooltip, Typography } from 'antd';
import React, { useState } from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine, RiQuestionLine } from 'react-icons/ri';

import { core } from 'accumulate.js';
import { AccountRecord } from 'accumulate.js/lib/api_v3';
import { AccountType } from 'accumulate.js/lib/core';

import { isRecordOf } from '../../utils/types';
import { AccTitle } from '../common/AccTitle';
import { EnumValue } from '../common/EnumValue';
import { InfoTable } from '../common/InfoTable';
import { Nobr } from '../common/Nobr';
import { RawData } from '../common/RawData';
import tooltipDescs from '../common/TooltipDescriptions';
import { describeProperty } from '../common/properties';
import { Settings } from '../explorer/Settings';
import { AccChains } from './AccChains';
import Authorities from './Authorities';
import { DataAccount } from './DataAccount';
import { Identity } from './Identity';
import { KeyBook } from './KeyBook';
import { KeyPage } from './KeyPage';
import { TokenAccount } from './TokenAccount';
import { TokenIssuer } from './TokenIssuer';
import { describeParent } from './parent';

const { Title } = Typography;

export function Account({ record }: { record: AccountRecord }) {
  if (isRecordOf(record, core.LiteIdentity, core.ADI)) {
    return <Identity record={record} />;
  }
  if (isRecordOf(record, core.LiteTokenAccount, core.TokenAccount)) {
    return <TokenAccount record={record} />;
  }
  if (isRecordOf(record, core.LiteDataAccount, core.DataAccount)) {
    return <DataAccount record={record} />;
  }
  if (isRecordOf(record, core.TokenIssuer)) {
    return <TokenIssuer record={record} />;
  }
  if (isRecordOf(record, core.KeyPage)) {
    return <KeyPage record={record} />;
  }
  if (isRecordOf(record, core.KeyBook)) {
    return <KeyBook record={record} />;
  }
  return <Account.Generic record={record} />;
}

Account.Generic = function ({ record }: { record: AccountRecord }) {
  // This is a hack to make it easier to check sequences
  const { account } = record;
  switch (account.type) {
    case AccountType.SyntheticLedger:
    case AccountType.AnchorLedger:
      for (const s of account.sequence) {
        if (s.url.path === '' || s.url.path === '/') {
          s.url = s.url.join(account.url.path);
        }
      }
      break;
  }

  const labelURL = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.acctUrl}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Account URL
      </Nobr>
    </span>
  );

  const accountObj = account.asObject();
  return (
    <div>
      <AccTitle title="Account" url={account.url} />

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
        Account Info
      </Title>
      <InfoTable>
        <Descriptions.Item label={labelURL}>
          {account.url.toString()}
        </Descriptions.Item>

        {describeParent(account)}
      </InfoTable>

      {/* Other properties */}
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Properties
      </Title>
      <InfoTable>
        {Object.entries(account).map(([key, value]) => {
          if (key === 'type' || key === 'url') {
            return null;
          }
          return describeProperty({ key, value, obj: accountObj });
        })}
      </InfoTable>

      {/* Authorities (may be inherited) */}
      <Authorities account={account} />

      {/* Chains and pending transactions */}
      <AccChains account={account.url} />
    </div>
  );
};
