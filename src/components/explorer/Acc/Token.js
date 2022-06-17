import React from 'react';
import { Link } from 'react-router-dom';
import {
    RiStackLine
} from 'react-icons/ri';

import {
  Typography,
  Descriptions,
  Tooltip
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine
} from 'react-icons/ri';

import tooltipDescs from '../../common/TooltipDescriptions';
import TxChain from '../../common/TxChain';

const { Title } = Typography;

const Token = props => {

    const token = props.data;

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

                        {token.data.keyBook ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyBook}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Book</nobr></span>}>
                                <Link to={'/acc/' + token.data.keyBook.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiStackLine /></IconContext.Provider>{token.data.keyBook}
                                </Link>
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

                    <TxChain url={token.data.url} type='pending' />
                </div>
            ) :
                null
            }
        </div>
    );
}

export default Token;
