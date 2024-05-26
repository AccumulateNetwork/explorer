import {
  Alert,
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
  RiExchangeLine,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';

import { AccChains } from '../../common/AccChains';
import { tokenAmount, tokenAmountToLocaleString } from '../../common/Amount';
import Authorities from '../../common/Authorities';
import FaucetAddress from '../../common/Faucet';
import getToken from '../../common/GetToken';
import tooltipDescs from '../../common/TooltipDescriptions';

const { Text, Title, Paragraph } = Typography;

const TokenAccount = (props) => {
  const tokenAccount = props.data;
  if (!tokenAccount?.account?.balance) tokenAccount.account.balance = 0;
  const [token, setToken] = useState(null);
  const [stakingAccount, setStakingAccount] = useState(null);
  const [error, setError] = useState(null);

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
    getToken(tokenAccount.account.tokenUrl, setToken, setError);
    getStakingInfo(tokenAccount.account.url);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <Descriptions bordered column={1} size="middle">
        {tokenAccount.recordType ? (
          <Descriptions.Item label="Type">
            {tokenAccount.recordType}
          </Descriptions.Item>
        ) : null}
      </Descriptions>

      {tokenAccount.account && token ? (
        <div>
          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Token Account Info
          </Title>

          <Descriptions bordered column={1} size="middle">
            {tokenAccount.account.url ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.tokenAcctUrl}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      URL
                    </nobr>
                  </span>
                }
              >
                {tokenAccount.account.url}
                {tokenAccount.account.url === FaucetAddress ? (
                  <Paragraph className="inline-tip">Faucet address</Paragraph>
                ) : null}
              </Descriptions.Item>
            ) : null}

            {tokenAccount.adi ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.adiUrl}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      ADI
                    </nobr>
                  </span>
                }
              >
                <Link to={'/acc/' + tokenAccount.adi.replace('acc://', '')}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountCircleLine />
                  </IconContext.Provider>
                  {tokenAccount.adi}
                </Link>
              </Descriptions.Item>
            ) : null}

            {tokenAccount.lightIdentity ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.lightIdentityUrl}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Identity
                    </nobr>
                  </span>
                }
              >
                <Link
                  to={
                    '/acc/' + tokenAccount.lightIdentity.replace('acc://', '')
                  }
                >
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountCircleLine />
                  </IconContext.Provider>
                  {tokenAccount.lightIdentity}
                </Link>
              </Descriptions.Item>
            ) : null}

            {tokenAccount.account.token && token.symbol ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.token}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Token
                    </nobr>
                  </span>
                }
              >
                {token.symbol}
                <br />
                <Link
                  to={
                    '/acc/' + tokenAccount.account.token.replace('acc://', '')
                  }
                >
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiCoinLine />
                  </IconContext.Provider>
                  {tokenAccount.account.token}
                </Link>
              </Descriptions.Item>
            ) : null}

            {(tokenAccount.account.balance ||
              tokenAccount.account.balance === 0) &&
            token.symbol ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.balance}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Balance
                    </nobr>
                  </span>
                }
              >
                {tokenAmount(
                  tokenAccount.account.balance,
                  token.precision,
                  token.symbol,
                )}
                <br />
                <Text className="formatted-balance">
                  {tokenAmountToLocaleString(
                    tokenAccount.account.balance,
                    token.precision,
                    token.symbol,
                  )}
                </Text>
              </Descriptions.Item>
            ) : null}

            {stakingAccount && stakingAccount.type ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.stakingType}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Staking Type
                    </nobr>
                  </span>
                }
              >
                <Tag color={stakingAccount.type ? 'green' : 'cyan'}>
                  {stakingAccount.type}
                </Tag>
                {stakingAccount.delegate ? (
                  <Link
                    to={'/acc/' + stakingAccount.delegate.replace('acc://', '')}
                  >
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
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.stakingRewards}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Staking Rewards
                    </nobr>
                  </span>
                }
              >
                <Link
                  to={'/acc/' + stakingAccount.rewards.replace('acc://', '')}
                >
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountCircleLine />
                  </IconContext.Provider>
                  {stakingAccount.rewards}
                </Link>
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          <Authorities items={tokenAccount.account.authorities} />

          <AccChains account={tokenAccount.account.url} />
        </div>
      ) : (
        <div>
          {error ? (
            <div className="skeleton-holder">
              <Alert message={error} type="error" showIcon />
            </div>
          ) : (
            <div>
              <Title level={4}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiInformationLine />
                </IconContext.Provider>
                Token Account Info
              </Title>
              <div className="skeleton-holder">
                <Skeleton active />
              </div>
              <Title level={4}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiExchangeLine />
                </IconContext.Provider>
                Transactions
              </Title>
              <div className="skeleton-holder">
                <Skeleton active />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenAccount;
