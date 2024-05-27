import {
  Descriptions,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiCoinLine,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';

import { AccountRecord } from 'accumulate.js/lib/api_v3';
import {
  AccountType,
  TokenAccount as AdiTokenAccount,
  LiteTokenAccount,
  TokenIssuer,
} from 'accumulate.js/lib/core';

import { getParentUrl } from '../../../utils/url';
import { TokenAmount } from '../../common/Amount';
import { EnumValue } from '../../common/EnumValue';
import { Link } from '../../common/Link';
import { Nobr } from '../../common/Nobr';
import { queryEffect } from '../../common/Shared';
import tooltipDescs from '../../common/TooltipDescriptions';
import { AccChains } from './AccChains';
import Authorities from './Authorities';

const { Title } = Typography;

const TokenAccount = ({ record }: { record: AccountRecord }) => {
  const account = record.account as AdiTokenAccount | LiteTokenAccount;
  const parentUrl = getParentUrl(account.url);

  const [issuer, setIssuer] = useState<TokenIssuer>();
  const [stakingAccount, setStakingAccount] = useState(null);

  (
    queryEffect(account.tokenUrl, {
      queryType: 'default',
    }) as Promise<AccountRecord>
  ).then(({ account }) => {
    if (account.type !== AccountType.TokenIssuer) return;
    setIssuer(account);
  });

  const getStakingInfo = async (url) => {
    if (!import.meta.env.VITE_APP_METRICS_API_PATH) return;

    try {
      const response = await axios.get(
        import.meta.env.VITE_APP_METRICS_API_PATH + '/staking/stakers/' + url,
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

  return (
    <div>
      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label="Type">
          <EnumValue type={AccountType} value={account.type} />
        </Descriptions.Item>
      </Descriptions>

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Token Account Info
      </Title>

      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item
          label={
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
                URL
              </Nobr>
            </span>
          }
        >
          {account.url.toString()}
        </Descriptions.Item>

        {parentUrl && (
          <Descriptions.Item
            label={
              <span>
                <Nobr>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <Tooltip
                      overlayClassName="explorer-tooltip"
                      title={
                        account instanceof AdiTokenAccount
                          ? tooltipDescs.adiUrl
                          : tooltipDescs.lightIdentityUrl
                      }
                    >
                      <RiQuestionLine />
                    </Tooltip>
                  </IconContext.Provider>
                  {account instanceof AdiTokenAccount ? 'ADI' : 'Identity'}
                </Nobr>
              </span>
            }
          >
            <Link to={parentUrl}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiAccountCircleLine />
              </IconContext.Provider>
              {parentUrl.toString()}
            </Link>
          </Descriptions.Item>
        )}

        <Descriptions.Item
          label={
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
          }
        >
          {issuer?.symbol && <div>{issuer.symbol}</div>}

          {issuer ? (
            <Link to={issuer.url}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiCoinLine />
              </IconContext.Provider>
              {issuer.url.toString()}
            </Link>
          ) : (
            <Skeleton active title={false} paragraph={{ rows: 1 }} />
          )}
        </Descriptions.Item>

        <Descriptions.Item
          label={
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
          }
        >
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
          <Descriptions.Item
            label={
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
            }
          >
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
          <Descriptions.Item
            label={
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
            }
          >
            <Link to={stakingAccount.rewards}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiAccountCircleLine />
              </IconContext.Provider>
              {stakingAccount.rewards}
            </Link>
          </Descriptions.Item>
        ) : null}
      </Descriptions>

      <Authorities account={account} />

      <AccChains account={account.url} />
    </div>
  );
};

export default TokenAccount;
