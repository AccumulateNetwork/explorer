import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
    Typography,
    Skeleton,
    Descriptions,
    Alert
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiAccountCircleLine, RiCoinLine, RiExchangeLine
} from 'react-icons/ri';

import RPC from '../common/RPC';
import { tokenAmount, tokenAmountToLocaleString } from './TokenAmount';

const { Title, Text } = Typography;

const TxSyntheticDepositTokens = props => {

    const tx = props.data;
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);

    const getToken = async () => {
        setToken(null);
        setError(null);
        try {
            let params = {url: tx.data.token};
            const response = await RPC.request("query", params);
            if (response && response.data) {
                if (!response?.data?.precision) response.data.precision = 0
                setToken(response.data);
            } else {
                throw new Error("Token " + tx.data.token + " not found"); 
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

        <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiInformationLine />
            </IconContext.Provider>
            Synthetic Deposit Transaction
        </Title>

        {tx && tx.data ? (
            <Descriptions bordered column={1} size="middle">

                <Descriptions.Item label={"Token"}>
                    {token && token.url ? (
                        <Link to={'/acc/' + token.url.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiCoinLine /></IconContext.Provider>{token.url}</Link>
                        ) : 
                        <Skeleton active paragraph={false} />
                    }
                </Descriptions.Item>

                <Descriptions.Item label={"Amount"}>
                    {token && tx.data.amount &&
                        <span>
                            <Text>{tokenAmount(tx.data.amount, token.precision, token.symbol)}</Text>
                            <br /><Text className="formatted-balance">{tokenAmountToLocaleString(tx.data.amount, token.precision, token.symbol)}</Text>
                        </span>
                    }
                    {error &&
                        <Alert message={error} type="error" showIcon />  
                    }
                    {(!error && !token) &&
                        <Skeleton active paragraph={false} />
                    }
                </Descriptions.Item>

                {tx.data.cause &&
                    <Descriptions.Item label={"Cause"}>
                        <Link to={'/acc/' + tx.data.cause.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>{tx.data.cause}</Link>
                    </Descriptions.Item>
                }

                {tx.data.source &&
                    <Descriptions.Item label={"Source"}>
                        <Link to={'/acc/' + tx.data.source.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.data.source}</Link>
                    </Descriptions.Item>
                }

                {tx.data.initiator &&
                    <Descriptions.Item label={"Initiator"}>
                        <Link to={'/acc/' + tx.data.initiator.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.data.initiator}</Link>
                    </Descriptions.Item>
                }

            </Descriptions>
        ) :
            <div className="skeleton-holder">
                <Skeleton active />
            </div>
        }

    </div>
    );
}

export default TxSyntheticDepositTokens;