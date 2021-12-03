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

const { Title, Paragraph, Text } = Typography;

const TokenTx = props => {

    const tx = props.data;
    const [tokenAccount, setTokenAccount] = useState(null);
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);

    const getToken = async () => {
        setTokenAccount(null);
        setToken(null);
        setError(null);
        try {
            let params = {url: tx.data.from};
            const response = await RPC.request("query", params);
            if (response && response.data) {
                setTokenAccount(response.data);
            } else {
                throw new Error("Token Account " + tx.data.from + " not found"); 
            }

            let params2 = {url: response.data.tokenUrl};
            const response2 = await RPC.request("query", params2);
            if (response2 && response2.data) {
                setToken(response2.data);
            } else {
                throw new Error("Token " + response.data.tokenUrl + " not found"); 
            }
        }
        catch(error) {
            setTokenAccount(null);
            setToken(null);
            setError(error.message);
        }
    }

    function TxOutputs(props) {
        const data = props.tx;
        const items = data.map((item, index) =>
          <Paragraph key={{index}}>
            {(item.amount/(10**props.token.precision)).toFixed(props.token.precision).replace(/\.?0+$/, "")} {props.token.symbol}
            <Text type="secondary">  →  </Text>
            <Link to={'/acc/' + item.url.replace("acc://", "")}>
                <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{item.url}
            </Link>
          </Paragraph>
      );
      return (
        <span className="break-all">{items}</span>
      );
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
            
            {tx && tokenAccount && token ? (
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

                    {tx.data.to && tokenAccount && token ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txTo}><RiQuestionLine /></Tooltip></IconContext.Provider>Output</nobr></span>}>
                            {tx.data.to && Array.isArray(tx.data.to) && tx.data.to[0] ? (
                                <TxOutputs tx={tx.data.to} token={token} />
                            ) :
                                <Text disabled>N/A</Text>
                            }
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

export default TokenTx;
