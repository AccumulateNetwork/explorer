import React, { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Skeleton,
  Tooltip,
  Alert
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiAccountCircleLine, RiExchangeLine
} from 'react-icons/ri';

import RPC from '../../common/RPC';
import FaucetAddress from '../../common/Faucet';
import tooltipDescs from '../../common/TooltipDescriptions';

const { Title, Paragraph } = Typography;

const SyntheticTx = props => {

    const tx = props.data;
    console.log(props.data);
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);

    const getToken = async () => {
        setToken(null);
        setError(null);
        try {
            let params = {url: tx.data.tokenURL};
            const response = await RPC.request("query", params);
            if (response && response.data) {
                setToken(response.data);
            } else {
                throw new Error("Token " + response.data.tokenUrl + " not found"); 
            }
        }
        catch(error) {
            setToken(null);
            setError(error.message);
        }
    }

    useEffect(() => {
        getToken();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>

            <Descriptions bordered column={1} size="middle">

                {tx.type ? (
                    <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.adiUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Type</nobr></span>}>
                        {tx.type}
                    </Descriptions.Item>
                ) :
                    null
                }

            </Descriptions>
            
            {tx && token ? (
                <div>
                <Title level={4}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiInformationLine />
                  </IconContext.Provider>
                  Transaction Info
                </Title>
                <Descriptions bordered column={1} size="middle">

                    {tx.txid ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txId}><RiQuestionLine /></Tooltip></IconContext.Provider>Txid</nobr></span>}>
                            <span className="code">{tx.txid}</span>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.data.txid ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txId}><RiQuestionLine /></Tooltip></IconContext.Provider>Parent Txid</nobr></span>}>
                            <Link to={'/tx/' + tx.data.txid} className="code"><IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>{tx.data.txid}</Link>
                       </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.data.from ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txFrom}><RiQuestionLine /></Tooltip></IconContext.Provider>Input</nobr></span>}>
                            <Link to={'/acc/' + tx.data.from.replace("acc://", "")}>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.data.from}
                            </Link>
                            {tx.data.from === FaucetAddress ? (
                                <Paragraph className="inline-tip">Faucet address</Paragraph>
                            ) : 
                                null
                            }
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.data.to ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txTo}><RiQuestionLine /></Tooltip></IconContext.Provider>Output</nobr></span>}>
                            <Link to={'/acc/' + tx.data.to.replace("acc://", "")}>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.data.to}
                            </Link>
                            {tx.data.to === FaucetAddress ? (
                                <Paragraph className="inline-tip">Faucet address</Paragraph>
                            ) : 
                                null
                            }
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.data.amount && token ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.amount}><RiQuestionLine /></Tooltip></IconContext.Provider>Amount</nobr></span>}>
                            {(tx.data.amount/(10**token.precision)).toFixed(token.precision).replace(/\.?0+$/, "")} {token.symbol}
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
                                Transaction Info
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

export default SyntheticTx;
