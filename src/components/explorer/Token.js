import React, { useState, useEffect } from 'react';

import {
  Typography,
  Descriptions,
  Skeleton,
  Alert,
  Tooltip
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine
} from 'react-icons/ri';

import RPC from './../common/RPC';
import tooltipDescs from './../common/TooltipDescriptions';


const { Title } = Typography;

const Token = ({ match }) => {

    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);

    const getToken = async (url) => {
        document.title = "Token " + url + " | Accumulate Explorer";
        setToken(null);
        setError(null);
        try {
            let params = {url: url};
            const response = await RPC.request("token", params);
            if (response.data && response.type === "token") {
                setToken(response.data);
            } else {
                throw new Error("Token " + url + " not found"); 
            }
        }
        catch(error) {
            setToken(null);
            setError(error.message);
        }
    }

    useEffect(() => {
        getToken(match.params.url);
    }, [match.params.url]);

    return (
        <div>
            <Title level={2}>Token</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable>{match.params.url}</Title>
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
                        {error ? (
                            <div className="skeleton-holder">
                                <Alert message={error} type="error" showIcon />
                            </div>
                        ) :
                            <div>
                                <Title level={4}>
                                  <IconContext.Provider value={{ className: 'react-icons' }}>
                                    <RiInformationLine />
                                  </IconContext.Provider>
                                  Token Info
                                </Title>
                                <div className="skeleton-holder">
                                    <Skeleton active />
                                </div>
                            </div>
                        }
                    </div>
                }
        </div>
    );
}

export default Token;
