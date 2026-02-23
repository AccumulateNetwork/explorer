import { Descriptions, Progress, Skeleton, Tooltip, Typography } from 'antd';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine, RiQuestionLine } from 'react-icons/ri';

import { core } from 'accumulate.js';
import { AccountType } from 'accumulate.js/lib/core';

import getSupply from '../../utils/getSupply';
import tooltipDescs from '../../utils/lang';
import { AccountRecordOf } from '../../utils/types';
import { ACME } from '../../utils/url';
import { AccTitle } from '../common/AccTitle';
import { TokenAmount } from '../common/Amount';
import { EnumValue } from '../common/EnumValue';
import { InfoTable } from '../common/InfoTable';
import { Network } from '../common/Network';
import { Nobr } from '../common/Nobr';
import { AccChains } from './AccChains';
import Authorities from './Authorities';
import { describeParent } from './parent';

const { Title, Text } = Typography;

export function TokenIssuer({
  record,
}: {
  record: AccountRecordOf<core.TokenIssuer>;
}) {
  const { account } = record;

  const labelURL = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.tokenUrl}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Token URL
      </Nobr>
    </span>
  );

  const labelSymbol = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.tokenSymbol}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Symbol
      </Nobr>
    </span>
  );

  const labelPrecision = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.tokenPrecision}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Precision
      </Nobr>
    </span>
  );

  return (
    <div>
      <AccTitle title="Token Issuer" url={account.url} linkable={account} />

      {/* Account type */}
      <InfoTable>
        <Descriptions.Item label="Type">
          <EnumValue type={AccountType} value={account.type} />
        </Descriptions.Item>
      </InfoTable>

      {/* Max, total, and circulating supply */}
      <TokenIssuer.Supply account={account} />

      {/* General info like the URL and ADI */}
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Token Info
      </Title>
      <InfoTable>
        <Descriptions.Item label={labelURL}>
          {account.url.toString()}
        </Descriptions.Item>

        {describeParent(account)}

        {account.symbol ? (
          <Descriptions.Item label={labelSymbol}>
            {account.symbol}
          </Descriptions.Item>
        ) : null}

        <Descriptions.Item label={labelPrecision}>
          {account.precision || 0}
        </Descriptions.Item>
      </InfoTable>

      {/* Authorities (may be inherited) */}
      <Authorities account={account} />

      {/* Chains and pending transactions */}
      <AccChains account={account.url} />
    </div>
  );
}

TokenIssuer.Supply = function ({ account }: { account: core.TokenIssuer }) {
  const [supply, setSupply] = useState(null);

  const { network } = useContext(Network);
  const isACME = account.url.equals(ACME) && network.metrics;
  useEffect(() => {
    if (isACME) {
      getSupply(network, setSupply);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const title = (
    <Title level={4}>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        <RiInformationLine />
      </IconContext.Provider>
      Supply
    </Title>
  );

  if (isACME && !supply) {
    return (
      <div>
        {title}
        <div className="skeleton-holder">
          <Skeleton active />
        </div>
      </div>
    );
  }

  const labelMax = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.maxSupply}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Max supply
      </Nobr>
    </span>
  );

  const labelTotal = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.totalSupply}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Total supply
      </Nobr>
    </span>
  );

  const labelCirculating = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.circAcmeSupply}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Circulating supply
      </Nobr>
    </span>
  );

  const issuedPercent = !account.supplyLimit
    ? NaN
    : Math.round(Number(((account.issued || 0n) * 100n) / account.supplyLimit));

  return (
    <div>
      {title}
      <InfoTable>
        {account.supplyLimit && (
          <Descriptions.Item label={labelMax}>
            <TokenAmount
              amount={account.supplyLimit}
              issuer={account}
              digits={{ max: 0, group: true }}
            />
          </Descriptions.Item>
        )}

        <Descriptions.Item label={labelTotal}>
          <TokenAmount
            amount={account.issued || 0}
            issuer={account}
            digits={{ max: 0, group: true }}
          />
          {account.supplyLimit && (
            <div>
              <Progress
                percent={issuedPercent}
                strokeColor={'#1677ff'}
                showInfo={false}
              />
              <Text type="secondary">
                {issuedPercent}% of max supply is issued
              </Text>
            </div>
          )}
        </Descriptions.Item>

        {isACME && (
          <>
            <Descriptions.Item label={labelCirculating}>
              {supply.circulatingTokens.toLocaleString('en-US', {
                maximumFractionDigits: 0,
              })}{' '}
              ACME
              <Progress
                percent={Math.round((supply.total / supply.max) * 100)}
                success={{
                  percent: Math.round((supply.circulating / supply.max) * 100),
                  strokeColor: '#1677ff',
                }}
                strokeColor={'#d6e4ff'}
                showInfo={false}
              />
              <Text type="secondary">
                {Math.round((supply.circulating / supply.total) * 100)}% of total
                supply is circulating
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Staked">
              {supply.staked.toLocaleString('en-US', {
                maximumFractionDigits: 0,
              })}{' '}
              ACME
              <div>
                <Text type="secondary">
                  {Math.round((supply.staked / supply.total) * 100)}% of total
                  supply is staked
                </Text>
              </div>
            </Descriptions.Item>
          </>
        )}
      </InfoTable>
    </div>
  );
};
