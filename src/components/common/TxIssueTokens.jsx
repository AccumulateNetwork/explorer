import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
    Typography,
    Skeleton,
    Descriptions,
    Alert,
    Tag
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiAccountCircleLine
} from 'react-icons/ri';

import getToken from './GetToken';
import TxTo from './TxTo';
import {tokenAmount, tokenAmountToLocaleString } from './TokenAmount';

const { Title, Text } = Typography;

const TxIssueTokens = props => {

    const tx = props.data;
    if (tx.data && tx.data.amount && tx.data.recipient) {
        if (tx?.message?.transaction?.body && !tx?.message?.transaction?.body?.to) tx.message.transaction.body.to = []
        tx.message.transaction.body.to.push({ amount: tx.data.amount, url: tx.data.recipient });
        delete(tx.data.amount)
        delete(tx.data.recipient);
    } else if (tx?.message?.transaction?.body?.to?.length > 0 && !tx?.data?.recipient) {
        tx.amount = tx?.message?.transaction?.body?.to.reduce((accumulator, currentValue) => accumulator + Number(currentValue.amount), 0);
    }
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        getToken(tx.message.transaction?.header?.principal, setToken, setError);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>

            <Title level={4} style={{ marginTop: 30 }}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiInformationLine />
                </IconContext.Provider>
                Transaction Data
            </Title>

            {tx?.message?.transaction ? (
                <Descriptions bordered column={1} size="middle">

                    <Descriptions.Item label={"Origin"}>
                        {tx.message.transaction?.header?.principal ? (
                            <Link to={'/acc/' + tx.message.transaction.header.principal.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.message.transaction.header.principal}</Link>
                        ) :
                            <Skeleton active paragraph={false} />
                        }
                    </Descriptions.Item>

                    {tx.amount > 0 && token ? (
                        <Descriptions.Item label={"Amount"}>
                            <Text>{tokenAmount(tx.amount, token.precision, token.symbol)}</Text>
                            <br /><Text className="formatted-balance">{tokenAmountToLocaleString(tx.amount, token.precision, token.symbol)}</Text>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.message.transaction?.body?.type ? (
                        <Descriptions.Item label={"Type"}>
                            <Tag color="green">{tx.message.transaction.body.type}</Tag>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx?.message?.transaction?.body?.to ? (
                        <Descriptions.Item label={"To"} className={"align-top"}>
                            {token &&
                                <TxTo data={tx.message.transaction.body.to} token={token} />
                            }
                            {error &&
                                <Alert message={error} type="error" showIcon />
                            }
                            {(!error && !token) &&
                                <Skeleton active title={false} />
                            }
                        </Descriptions.Item>
                    ) :
                        null
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

export default TxIssueTokens;