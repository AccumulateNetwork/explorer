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
    RiInformationLine, RiAccountCircleLine, RiCoinLine
} from 'react-icons/ri';

import RPC from '../common/RPC';

const { Title, Text, Paragraph } = Typography;

const TxIssueTokens = props => {

    const tx = props.data;
    if (tx.data && tx.data.amount && tx.data.recipient) {
        if (!tx.data.to) tx.data.to = []
        tx.data.to.push({ amount: tx.data.amount, url: tx.data.recipient });
        delete(tx.data.amount)
        delete(tx.data.recipient);
    }
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);

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

    //TODO Refactor (duplicated code in TxSendTokes.js)
    function TxTo(props) {
        const data = props.data;
        const items = data.map((item, index) =>
            <Paragraph key={{index}}>
                {item.url ? (
                    <Link to={'/acc/' + item.url.replace("acc://", "")}>
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{item.url}
                    </Link>
                ) :
                    <Text disabled>N/A</Text>
                }
                <br />
                {(item.amount && token) ? (
                    <span>
                        <Text>{(item.amount / (10 ** token.precision)).toFixed(token.precision).replace(/(\.\d*?[1-9])0+$/,"$1")} {token.symbol}</Text>
                        <br /><Text className="formatted-balance">{parseFloat(item.amount / (10 ** token.precision)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {token.symbol}</Text>
                    </span>
                ) :
                    null
                }
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

                    {tx.data.amount > 0 ? (
                        <Descriptions.Item label={"Amount"}>
                            <Text>{tx.data.amount}</Text>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.data.type ? (
                        <Descriptions.Item label={"Type"}>
                            <Text>{tx.data.type}</Text>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.data.to ? (
                        <Descriptions.Item label={"To"} className={"align-top"}>
                            {token &&
                                <TxTo data={tx.data.to} />
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