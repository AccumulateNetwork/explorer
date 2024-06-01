import { Descriptions, Tooltip, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import {
  RiFolder2Line,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';

import { core } from 'accumulate.js';
import { AccountType } from 'accumulate.js/lib/core';

import tooltipDescs from '../../utils/lang';
import { AccountRecordOf } from '../../utils/types';
import { AccTitle } from '../common/AccTitle';
import { CreditAmount } from '../common/Amount';
import Count from '../common/Count';
import { EnumValue } from '../common/EnumValue';
import { InfoTable } from '../common/InfoTable';
import { Nobr } from '../common/Nobr';
import { AccChains } from './AccChains';
import Authorities from './Authorities';
import { Directory } from './Directory';

const { Title, Text } = Typography;

export function Identity({
  record,
}: {
  record: AccountRecordOf<core.ADI | core.LiteIdentity>;
}) {
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
      <InfoTable>
        <Descriptions.Item label="Type">{typeStr}</Descriptions.Item>
      </InfoTable>

      {/* General info like the URL and ADI */}
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        {typeStr} Info
      </Title>
      <InfoTable>
        <Descriptions.Item label={labelURL}>
          {account.url.toString()}
        </Descriptions.Item>

        {account instanceof core.LiteIdentity && (
          <Descriptions.Item label={labelBalance}>
            <CreditAmount amount={account.creditBalance || 0} />
          </Descriptions.Item>
        )}
      </InfoTable>

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
