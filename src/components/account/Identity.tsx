import { Descriptions, Tooltip, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import {
  RiFolder2Line,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';

import { core } from 'accumulate.js';
import { AccountRecord } from 'accumulate.js/lib/api_v3';
import { AccountType } from 'accumulate.js/lib/core';

import { AccTitle } from '../common/AccTitle';
import { CreditAmount } from '../common/Amount';
import Count from '../common/Count';
import { EnumValue } from '../common/EnumValue';
import { Nobr } from '../common/Nobr';
import tooltipDescs from '../common/TooltipDescriptions';
import { AccChains } from './AccChains';
import Authorities from './Authorities';
import { Directory } from './Directory';

const { Title, Text } = Typography;

export function Identity({ record }: { record: AccountRecord }) {
  if (
    !(record.account instanceof core.ADI) &&
    !(record.account instanceof core.LiteIdentity)
  )
    throw new Error('Wrong account type for component');
  const { account } = record;

  const typeStr =
    account instanceof core.ADI ? (
      'ADI'
    ) : (
      <EnumValue type={AccountType} value={account.type} />
    );

  const labelURL = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.adiUrl}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        URL
      </Nobr>
    </span>
  );

  const labelBalance = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.creditBalance}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Credit Balance
      </Nobr>
    </span>
  );
  return (
    <div>
      <AccTitle title="Account" url={account.url} />

      {/* Account type */}
      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label="Type">{typeStr}</Descriptions.Item>
      </Descriptions>

      {/* General info like the URL and ADI */}
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        {typeStr} Info
      </Title>
      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label={labelURL}>
          {account.url.toString()}
        </Descriptions.Item>

        {account instanceof core.LiteIdentity && (
          <Descriptions.Item label={labelBalance}>
            <CreditAmount amount={account.creditBalance || 0} />
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* Authorities (may be inherited) */}
      <Authorities account={account} />

      {/* Directory */}
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiFolder2Line />
        </IconContext.Provider>
        Directory
        <Count count={record?.directory?.total || 0} />
      </Title>

      <Directory record={record} />

      {/* Chains and pending transactions */}
      <AccChains account={account.url} />
    </div>
  );
}
