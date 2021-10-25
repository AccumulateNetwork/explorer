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

const { Title, Text, Paragraph } = Typography;

const Transaction = ({ match }) => {

    const [tx, setTx] = useState(null);
    const [error, setError] = useState(null);

    const getTx = async (hash) => {
        document.title = "Transaction " + hash + " | Accumulate Explorer";
        setTx(null);
        setError(null);
        try {
            let params = {hash: hash};
            const response = await RPC.request("token-tx", params);
            if (response.data && response.type === "tokenTx") {
                setTx(response.data);
            } else {
                throw new Error("Transaction not found"); 
            }
        }
        catch(error) {
            setTx(null);
            setError("Transaction " + hash + " not found");
        }
    }

    useEffect(() => {
        getTx(match.params.hash);
    }, [match.params.hash]);

    return (
        <div>
            <Title level={2}>Transaction</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable>{match.params.hash}</Title>
                {tx ? (
                    <div>
                        <Title level={4}>
                          <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiInformationLine />
                          </IconContext.Provider>
                          Transaction Info
                        </Title>
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Txid description"><RiQuestionLine /></Tooltip></IconContext.Provider>Txid</nobr></span>}>
                                {tx.txid}
                            </Descriptions.Item>
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="From description"><RiQuestionLine /></Tooltip></IconContext.Provider>From</nobr></span>}>
                                <Link to={'/accounts/' + tx.from.replace("acc://", "")}>
                                    {tx.from}
                                </Link>
                                {tx.from === "acc://7117c50f04f1254d56b704dc05298912deeb25dbc1d26ef6/ACME" ? (
                                    <Paragraph style={{ marginBottom: 0 }}><Text className="inline-tip"><IconContext.Provider value={{ className: 'react-icons' }}><RiInformationLine /></IconContext.Provider>Faucet address</Text></Paragraph>
                                ) : 
                                    null
                                }
                            </Descriptions.Item>
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Amount description"><RiQuestionLine /></Tooltip></IconContext.Provider>Amount</nobr></span>}>
                                {tx.amount}
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
