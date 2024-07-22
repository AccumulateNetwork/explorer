import { Descriptions, Typography } from 'antd';
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
import { WithIcon } from '../common/WithIcon';
import { useWeb3 } from '../web3/Context';
import { Dashboard } from '../web3/Dashboard';
import { AccChains } from './AccChains';
import Authorities from './Authorities';
import { Directory as Web3Directory } from './Directory';

const { Title, Text } = Typography;

export function Identity({
  record,
}: {
  record: AccountRecordOf<core.ADI | core.LiteIdentity>;
}) {
  const { account } = record;
  const web3 = useWeb3();
  const isWeb3Lite = web3.publicKey?.lite?.equals(account.url);

  const isADI = account instanceof core.ADI;
  const typeStr = isADI ? (
    'ADI'
  ) : (
    <EnumValue type={AccountType} value={account.type} />
  );

  const labelType = (
    <WithIcon
      icon={RiQuestionLine}
      tooltip={tooltipDescs.acctType}
      children="Type"
    />
  );

  const labelETH = (
    <WithIcon
      icon={RiQuestionLine}
      tooltip={tooltipDescs.web3.ethereumAddress}
      children="Ethereum Address"
    />
  );

  const labelURL = (
    <WithIcon
      icon={RiQuestionLine}
      tooltip={tooltipDescs.adiUrl}
      children="URL"
    />
  );

  const labelBalance = (
    <WithIcon
      icon={RiQuestionLine}
      tooltip={tooltipDescs.creditBalance}
      children="Credit Balance"
    />
  );

  return (
    <div>
      <AccTitle
        url={account.url}
        linkable={account}
        title={
          isWeb3Lite ? 'Web3 Wallet' : isADI ? 'Identity' : 'Lite Identity'
        }
      />

      {/* General info like the URL and ADI */}
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Account Info
      </Title>
      <InfoTable>
        <Descriptions.Item label={labelType}>{typeStr}</Descriptions.Item>

        {isWeb3Lite && (
          <Descriptions.Item label={labelETH}>
            <Text copyable>{web3.publicKey.ethereum}</Text>
          </Descriptions.Item>
        )}

        <Descriptions.Item label={labelURL}>
          {account.url.toString()}
        </Descriptions.Item>

        {account instanceof core.LiteIdentity && (
          <Descriptions.Item label={labelBalance}>
            <CreditAmount amount={account.creditBalance || 0} />
          </Descriptions.Item>
        )}
      </InfoTable>

      {isWeb3Lite && (
        <div style={{ marginBottom: 30 }}>
          <Dashboard />
        </div>
      )}

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

      <Web3Directory record={record} />

      {/* Chains and pending transactions */}
      <AccChains account={account.url} />
    </div>
  );
}
