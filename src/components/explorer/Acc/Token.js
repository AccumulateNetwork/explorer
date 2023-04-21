import React, { useState, useEffect } from 'react';

import {
  Typography,
  Descriptions,
  Tooltip,
  Skeleton, 
  Progress
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine
} from 'react-icons/ri';

import tooltipDescs from '../../common/TooltipDescriptions';
import TxChain from '../../common/TxChain';
import getSupply from '../../common/GetSupply'
import Authorities from '../../common/Authorities';

const { Title, Text } = Typography;

const Token = props => {

    const token = props.data;
    const [supply, setSupply] = useState(null);

    useEffect(() => {
        getSupply(setSupply);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>

            <Descriptions bordered column={1} size="middle">

                {token.type ? (
                    <Descriptions.Item label="Type">
                        {token.type}
                    </Descriptions.Item>
                ) :
                    null
                }

            </Descriptions>
            
            {token?.data?.symbol === "ACME" && 
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiInformationLine />
                        </IconContext.Provider>
                        ACME Supply
                    </Title>
                    
                    {supply ? (
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.maxSupply}><RiQuestionLine /></Tooltip></IconContext.Provider>Max supply</nobr></span>}>
                                {supply.maxTokens.toLocaleString('en-US', {maximumFractionDigits: 0})} ACME
                            </Descriptions.Item>
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.totalSupply}><RiQuestionLine /></Tooltip></IconContext.Provider>Total supply</nobr></span>}>
                                {supply.totalTokens.toLocaleString('en-US', {maximumFractionDigits: 0})} ACME
                                <Progress percent={Math.round(supply.total/supply.max*100)} strokeColor={"#1677ff"} showInfo={false} />
                                <Text type="secondary">{Math.round(supply.total/supply.max*100)}% of max supply is issued</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.circSupply}><RiQuestionLine /></Tooltip></IconContext.Provider>Circulating supply</nobr></span>}>
                                {supply.circulatingTokens.toLocaleString('en-US', {maximumFractionDigits: 0})} ACME
                                <Progress percent={Math.round(supply.total/supply.max*100)} success={{ percent: Math.round(supply.circulating/supply.max*100), strokeColor: "#1677ff" }} strokeColor={"#d6e4ff"} showInfo={false} />
                                <Text type="secondary">{Math.round(supply.circulating/supply.total*100)}% of total supply is circulating</Text>
                            </Descriptions.Item>
                        </Descriptions>
                    ) :
                        <div className="skeleton-holder">
                            <Skeleton active />
                        </div>
                    }
                </div>
            }

            {token.data ? (
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiInformationLine />
                        </IconContext.Provider>
                        Token Info
                    </Title>
                    <Descriptions bordered column={1} size="middle">

                        {token.data.url ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.tokenUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Token URL</nobr></span>}>
                                {token.data.url}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {token.data.symbol ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.tokenSymbol}><RiQuestionLine /></Tooltip></IconContext.Provider>Symbol</nobr></span>}>
                                {token.data.symbol}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {token.data.precision || token.data.precision === 0 ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.tokenPrecision}><RiQuestionLine /></Tooltip></IconContext.Provider>Precision</nobr></span>}>
                                {token.data.precision}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                    </Descriptions>

                    <Authorities items={token.data.authorities} />

                    <TxChain url={token.data.url} type='transaction' />
                    <TxChain url={token.data.url} type='pending' />
                    <TxChain url={token.data.url} type='signature' />

                </div>
            ) :
                null
            }
        </div>
    );
}

export default Token;
