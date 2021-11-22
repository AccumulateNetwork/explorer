import React from 'react';

import {
  Typography,
  Descriptions,
  Skeleton,
  Tooltip
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine
} from 'react-icons/ri';

import tooltipDescs from '../../common/TooltipDescriptions';

const { Title } = Typography;

const Token = props => {

    const token = props.data;

    return (
        <div>

            <Title level={4}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiInformationLine />
                </IconContext.Provider>
                Chain Info
            </Title>
            <Descriptions bordered column={1} size="middle">

                {token.type ? (
                    <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.adiUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Type</nobr></span>}>
                        {token.type}
                    </Descriptions.Item>
                ) :
                    null
                }

            </Descriptions>
            
            {token ? (
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiInformationLine />
                        </IconContext.Provider>
                        Token Info
                    </Title>
                    <Descriptions bordered column={1} size="middle">

                        {token.url ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.tokenUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Token URL</nobr></span>}>
                                {token.url}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {token.symbol ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.tokenSymbol}><RiQuestionLine /></Tooltip></IconContext.Provider>Symbol</nobr></span>}>
                                {token.symbol}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {token.precision ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.tokenPrecision}><RiQuestionLine /></Tooltip></IconContext.Provider>Precision</nobr></span>}>
                                {token.precision}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                    </Descriptions>
                </div>
            ) :
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiInformationLine />
                        </IconContext.Provider>
                        Chain Info
                    </Title>
                    <div className="skeleton-holder">
                        <Skeleton active />
                    </div>
                </div>
            }
        </div>
    );
}

export default Token;
