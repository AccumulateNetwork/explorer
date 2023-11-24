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

import getToken from './GetToken';
import { tokenAmount, tokenAmountToLocaleString } from './TokenAmount';

const { Title, Text } = Typography;

const TxSyntheticDepositTokens = props => {

    const tx = props.data;
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        getToken(tx.message.transaction.body.token, setToken, setError);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>

        <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiInformationLine />
            </IconContext.Provider>
            Synthetic Deposit Transaction
        </Title>

        {tx?.message?.transaction ? (
            <Descriptions bordered column={1} size="middle">

                <Descriptions.Item label={"Token"}>
                    {token && token.url ? (
                        <Link to={'/acc/' + token.url.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiCoinLine /></IconContext.Provider>{token.url}</Link>
                        ) : 
                        <Skeleton active paragraph={false} />
                    }
                </Descriptions.Item>

                <Descriptions.Item label={"Amount"}>
                    {token && tx.message.transaction.body.amount &&
                        <span>
                            <Text>{tokenAmount(tx.message.transaction.body.amount, token.precision, token.symbol)}</Text>
                            <br /><Text className="formatted-balance">{tokenAmountToLocaleString(tx.message.transaction.body.amount, token.precision, token.symbol)}</Text>
                        </span>
                    }
                    {error &&
                        <Alert message={error} type="error" showIcon />  
                    }
                    {(!error && !token) &&
                        <Skeleton active paragraph={false} />
                    }
                </Descriptions.Item>

                {tx?.cause?.records?.length > 0 &&
                    <Descriptions.Item label={"Cause"}>
                        <Link to={'/acc/' + tx.cause.records[0].value.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>{tx.cause.records[0].value}</Link>
                    </Descriptions.Item>
                }

                {tx?.message?.transaction?.body?.source &&
                    <Descriptions.Item label={"Source"}>
                        <Link to={'/acc/' + tx.message.transaction.body.source.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.message.transaction.body.source}</Link>
                    </Descriptions.Item>
                }

                {tx.message.transaction.body.initiator &&
                    <Descriptions.Item label={"Initiator"}>
                        <Link to={'/acc/' + tx.message.transaction.body.initiator.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.message.transaction.body.initiator}</Link>
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