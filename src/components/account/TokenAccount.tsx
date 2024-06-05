import {
  Descriptions,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiCoinLine,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';

import { core } from 'accumulate.js';
import { AccountType } from 'accumulate.js/lib/core';

import tooltipDescs from '../../utils/lang';
import { AccountRecordOf, isRecordOf } from '../../utils/types';
import { AccTitle } from '../common/AccTitle';
import { TokenAmount } from '../common/Amount';
import { EnumValue } from '../common/EnumValue';
import { InfoTable } from '../common/InfoTable';
import { Link } from '../common/Link';
import { Shared } from '../common/Network';
import { Nobr } from '../common/Nobr';
import { queryEffect } from '../common/query';
import { AccChains } from './AccChains';
import Authorities from './Authorities';
import { describeParent } from './parent';

const { Title } = Typography;

export function TokenAccount({
  record,
}: {
  record: AccountRecordOf<core.TokenAccount | core.LiteTokenAccount>;
}) {
  const { account } = record;

  const [issuer, setIssuer] = useState<core.TokenIssuer>();
  const [stakingAccount, setStakingAccount] = useState(null);

  queryEffect(account.tokenUrl, {
    queryType: 'default',
  }).then((r) => {
    if (isRecordOf(r, core.TokenIssuer)) {
      setIssuer(r.account);
    }
  });

  const { network } = useContext(Shared);
  const getStakingInfo = async (url) => {
    if (!network.metrics) return;

    try {
      const response = await axios.get(
        `${network.metrics}/staking/stakers/${url}`,
      );
      if (response && response.data && !response.data.error) {
        setStakingAccount(response.data);
      }
    } catch (error) {
      // no need to setError here, because an error won't prevent rendering of the page
      message.error('Can not get staking data from Metrics API');
    }
  };

  useEffect(() => {
    getStakingInfo(account.url);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const labelURL = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.tokenAcctUrl}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Token Account URL
      </Nobr>
    </span>
  );

  const labelIssuer = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.token}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Token
      </Nobr>
    </span>
  );

  const labelBalance = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.balance}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Balance
      </Nobr>
    </span>
  );

  const labelStakingAccount = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.stakingType}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Staking Type
      </Nobr>
    </span>
  );

  const labelStakingRewards = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.stakingRewards}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Staking Rewards
      </Nobr>
    </span>
  );

  return (
    <div>
      <AccTitle title="Token Account" url={account.url} linkable={account} />

      {/* Account type */}
      <InfoTable>
        <Descriptions.Item label="Type">
          <EnumValue type={AccountType} value={account.type} />
        </Descriptions.Item>
      </InfoTable>

      {/* General info like the URL and ADI plus staking account info */}
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Token Account Info
      </Title>

      <InfoTable>
        <Descriptions.Item label={labelURL}>
          {account.url.toString()}
        </Descriptions.Item>

        {describeParent(account)}

        <Descriptions.Item label={labelIssuer}>
          {issuer?.symbol && <div>{issuer.symbol}</div>}

          {issuer ? (
            <Link to={issuer.url}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiCoinLine />
              </IconContext.Provider>
              {issuer.url.toString()}
            </Link>
          ) : (
            <Skeleton
              className={'skeleton-singleline'}
              active
              title={true}
              paragraph={false}
            />
          )}
        </Descriptions.Item>

        <Descriptions.Item label={labelBalance}>
          <TokenAmount amount={account.balance} issuer={issuer} />
          <br />
          <TokenAmount
            className="formatted-balance"
            amount={account.balance}
            issuer={issuer}
            digits={{ min: 2, max: 2, group: true }}
          />
        </Descriptions.Item>

        {stakingAccount && stakingAccount.type ? (
          <Descriptions.Item label={labelStakingAccount}>
            <Tag color={stakingAccount.type ? 'green' : 'cyan'}>
              {stakingAccount.type}
            </Tag>
            {stakingAccount.delegate ? (
              <Link to={stakingAccount.delegate}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiAccountCircleLine />
                </IconContext.Provider>
                {stakingAccount.delegate}
              </Link>
            ) : null}
          </Descriptions.Item>
        ) : null}

        {stakingAccount && stakingAccount.rewards ? (
          <Descriptions.Item label={labelStakingRewards}>
            <Link to={stakingAccount.rewards}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiAccountCircleLine />
              </IconContext.Provider>
              {stakingAccount.rewards}
            </Link>
          </Descriptions.Item>
        ) : null}
      </InfoTable>

      {/* Authorities (may be inherited) */}
      <Authorities account={account} />

      {/* Chains and pending transactions */}
      <AccChains account={account.url} />
    </div>
  );
}
