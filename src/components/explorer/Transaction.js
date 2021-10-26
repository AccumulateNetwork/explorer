import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography, Descriptions, Tooltip, Alert, Skeleton
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine
} from 'react-icons/ri';

import RPC from './../common/RPC';
import FaucetAddress from './../common/Faucet';

const { Title, Text, Paragraph } = Typography;

const Transaction = ({ match }) => {

    const [tx, setTx] = useState(null);
    const [tokenAccount, setTokenAccount] = useState(null);
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);

    const getTx = async (hash) => {
        document.title = "Transaction " + hash + " | Accumulate Explorer";
        setTx(null);
        setTokenAccount(null);
        setToken(null);
        setError(null);
        try {

            let params = {hash: hash};
            const response = await RPC.request("token-tx", params);
            if (response.data && (response.type === "tokenTx" || response.type === "syntheticTokenDeposit")) {
                setTx(response.data);
            } else {
                throw new Error("Transaction not found"); 
            }

            let params2 = {url: response.data.from};
            const response2 = await RPC.request("token-account", params2);
            if (response2.data && response2.type === "anonTokenAccount") {
                setTokenAccount(response2.data);
            } else {
                throw new Error("Token Account not found"); 
            }

            let params3 = {url: response2.data.tokenUrl};
            const response3 = await RPC.request("token", params3);
            if (response3.data && response3.type === "token") {
                setToken(response3.data);
            } else {
                throw new Error("Token not found"); 
            }

        }
        catch(error) {
            setTx(null);
            setTokenAccount(null);
            setToken(null);
            setError("Transaction " + hash + " not found");
        }
    }

    useEffect(() => {
        getTx(match.params.hash);
    }, [match.params.hash]);

    function TxOutputs(props) {
        const data = props.tx;
        const items = data.map((item, index) =>
          <Paragraph key={{index}}>
            {item.amount/(10**props.token.token.precision)} {props.token.token.symbol}
            <Text type="secondary"> → </Text>
            <Link to={'/accounts/' + item.url.replace("acc://", "")}>
                {item.url}
            </Link>
          </Paragraph>
      );
      return (
        <span className="break-all">{items}</span>
      );
    }

    return (
        <div>
            <Title level={2}>Transaction</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable>{match.params.hash}</Title>
                {tx && tokenAccount && token ? (
                    <div>
                        <Title level={4}>
                          <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiInformationLine />
                          </IconContext.Provider>
                          Transaction Info
                        </Title>
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Txid description"><RiQuestionLine /></Tooltip></IconContext.Provider>Txid</nobr></span>}>
                                <span className="code">{tx.txid}</span>
                            </Descriptions.Item>
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="From description"><RiQuestionLine /></Tooltip></IconContext.Provider>Input</nobr></span>}>
                                <Link to={'/accounts/' + tx.from.replace("acc://", "")}>
                                    {tx.from}
                                </Link>
                                {tx.from === FaucetAddress ? (
                                    <Paragraph className="inline-tip"><IconContext.Provider value={{ className: 'react-icons' }}><RiInformationLine /></IconContext.Provider>Faucet address</Paragraph>
                                ) : 
                                    null
                                }
                            </Descriptions.Item>
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Output(s) description"><RiQuestionLine /></Tooltip></IconContext.Provider>Output(s)</nobr></span>}>
                                {tx.to && tx.to[0] ? (
                                    <TxOutputs tx={tx.to} token={token} />
                                ) :
                                    <Text disabled>N/A</Text>
                                }
                            </Descriptions.Item>
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

export default Transaction;
