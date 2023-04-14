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
    RiInformationLine, RiCoinLine
} from 'react-icons/ri';

import RPC from '../common/RPC';
import TxTo from './TxTo';
import {tokenAmount, tokenAmountToLocaleString } from './TokenAmount';

const { Title, Text } = Typography;

const TxIssueTokens = props => {

    const tx = props.data;
    if (tx.data && tx.data.amount && tx.data.recipient) {
        if (!tx.data.to) tx.data.to = []
        tx.data.to.push({ amount: tx.data.amount, url: tx.data.recipient });
        delete(tx.data.amount)
        delete(tx.data.recipient);
    } else if (tx?.data?.to?.length > 0 && !tx.data.recipient) {
        tx.data.amount = tx.data.to.reduce((accumulator, currentValue) => accumulator + Number(currentValue.amount), 0);
    }
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);

    //TODO Refactor
    const getToken = async () => {
        setToken(null);
        setError(null);
        try {
            let params = {url: tx.origin};
            const response = await RPC.request("query", params);
            if (response && response.data) {
                if (!response?.data?.precision) response.data.precision = 0
                setToken(response.data);
            } else {
                throw new Error("Token " + tx.origin + " not found");
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
                Transaction Data
            </Title>

            {tx && tx.data ? (
                <Descriptions bordered column={1} size="middle">

                    <Descriptions.Item label={"Token"}>
                        {tx.origin ? (
                            <Link to={'/acc/' + tx.origin.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiCoinLine /></IconContext.Provider>{tx.origin}</Link>
                        ) :
                            <Skeleton active paragraph={false} />
                        }
                    </Descriptions.Item>

                    {tx.data.amount > 0 && token ? (
                        <Descriptions.Item label={"Amount"}>
                            <Text>{tokenAmount(tx.data.amount, token.precision, token.symbol)}</Text>
                            <br /><Text className="formatted-balance">{tokenAmountToLocaleString(tx.data.amount, token.precision, token.symbol)}</Text>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.data.type ? (
                        <Descriptions.Item label={"Type"}>
                            <Tag color="green">{tx.data.type}</Tag>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.data.to ? (
                        <Descriptions.Item label={"To"} className={"align-top"}>
                            {token &&
                                <TxTo data={tx.data.to} token={token} />
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