import { Descriptions, Progress, Skeleton, Tooltip, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine, RiQuestionLine } from 'react-icons/ri';

import { AccChains } from '../../common/AccChains';
import Authorities from '../../common/Authorities';
import getSupply from '../../common/GetSupply';
import tooltipDescs from '../../common/TooltipDescriptions';

const { Title, Text } = Typography;

const Token = (props) => {
  const token = props.data;
  const [supply, setSupply] = useState(null);

  useEffect(() => {
    getSupply(setSupply);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <Descriptions bordered column={1} size="middle">
        {token.recordType ? (
          <Descriptions.Item label="Type">{token.recordType}</Descriptions.Item>
        ) : null}
      </Descriptions>

      {token?.account?.symbol === 'ACME' &&
        import.meta.env.VITE_APP_METRICS_API_PATH && (
          <div>
            <Title level={4}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiInformationLine />
              </IconContext.Provider>
              ACME Supply
            </Title>

            {supply ? (
              <Descriptions bordered column={1} size="middle">
                <Descriptions.Item
                  label={
                    <span>
                      <nobr>
                        <IconContext.Provider
                          value={{ className: 'react-icons' }}
                        >
                          <Tooltip
                            overlayClassName="explorer-tooltip"
                            title={tooltipDescs.maxSupply}
                          >
                            <RiQuestionLine />
                          </Tooltip>
                        </IconContext.Provider>
                        Max supply
                      </nobr>
                    </span>
                  }
                >
                  {supply.maxTokens.toLocaleString('en-US', {
                    maximumFractionDigits: 0,
                  })}
                   ACME
                </Descriptions.Item>
                <Descriptions.Item
                  label={
                    <span>
                      <nobr>
                        <IconContext.Provider
                          value={{ className: 'react-icons' }}
                        >
                          <Tooltip
                            overlayClassName="explorer-tooltip"
                            title={tooltipDescs.totalSupply}
                          >
                            <RiQuestionLine />
                          </Tooltip>
                        </IconContext.Provider>
                        Total supply
                      </nobr>
                    </span>
                  }
                >
                  {supply.totalTokens.toLocaleString('en-US', {
                    maximumFractionDigits: 0,
                  })}
                   ACME
                  <Progress
                    percent={Math.round((supply.total / supply.max) * 100)}
                    strokeColor={'#1677ff'}
                    showInfo={false}
                  />
                  <Text type="secondary">
                    {Math.round((supply.total / supply.max) * 100)}% of max
                    supply is issued
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item
                  label={
                    <span>
                      <nobr>
                        <IconContext.Provider
                          value={{ className: 'react-icons' }}
                        >
                          <Tooltip
                            overlayClassName="explorer-tooltip"
                            title={tooltipDescs.circSupply}
                          >
                            <RiQuestionLine />
                          </Tooltip>
                        </IconContext.Provider>
                        Circulating supply
                      </nobr>
                    </span>
                  }
                >
                  {supply.circulatingTokens.toLocaleString('en-US', {
                    maximumFractionDigits: 0,
                  })}
                   ACME
                  <Progress
                    percent={Math.round((supply.total / supply.max) * 100)}
                    success={{
                      percent: Math.round(
                        (supply.circulating / supply.max) * 100,
                      ),
                      strokeColor: '#1677ff',
                    }}
                    strokeColor={'#d6e4ff'}
                    showInfo={false}
                  />
                  <Text type="secondary">
                    {Math.round((supply.circulating / supply.total) * 100)}% of
                    total supply is circulating
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <div className="skeleton-holder">
                <Skeleton active />
              </div>
            )}
          </div>
        )}

      {token.account ? (
        <div>
          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Token Info
          </Title>
          <Descriptions bordered column={1} size="middle">
            {token.account.url ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.tokenUrl}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Token URL
                    </nobr>
                  </span>
                }
              >
                {token.account.url}
              </Descriptions.Item>
            ) : null}

            {token.account.symbol ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.tokenSymbol}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Symbol
                    </nobr>
                  </span>
                }
              >
                {token.account.symbol}
              </Descriptions.Item>
            ) : null}

            {token.account.precision || token.account.precision === 0 ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.tokenPrecision}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Precision
                    </nobr>
                  </span>
                }
              >
                {token.account.precision}
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          <Authorities items={token.account.authorities} />

          <AccChains account={token.account.url} />
        </div>
      ) : null}
    </div>
  );
};

export default Token;
