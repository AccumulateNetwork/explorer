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

                        {token.data.symbol ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.tokenSymbol}><RiQuestionLine /></Tooltip></IconContext.Provider>Symbol</nobr></span>}>
                                {token.data.symbol}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {token.data.precision ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.tokenPrecision}><RiQuestionLine /></Tooltip></IconContext.Provider>Precision</nobr></span>}>
                                {token.data.precision}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                    </Descriptions>
                </div>
            ) :
                null
            }
        </div>
    );
}

export default Token;
