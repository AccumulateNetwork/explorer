import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
    Typography,
    Descriptions,
    Tooltip,
    Tag,
    Table,
    Alert,
    Skeleton
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiAccountCircleLine, RiExchangeLine, RiCoinLine, RiRefund2Fill
} from 'react-icons/ri';

import RPC from '../../common/RPC';
import tooltipDescs from '../../common/TooltipDescriptions';
import FaucetAddress from '../../common/Faucet';
import Count from '../../common/Count';
import { tokenAmount, tokenAmountToLocaleString } from '../../common/TokenAmount';
import TxChain from '../../common/TxChain';
import Authorities from '../../common/Authorities';

const { Text, Title, Paragraph } = Typography;

const TokenAccount = props => {

    const tokenAccount = props.data;
    const [token, setToken] = useState(null);
    const [txs, setTxs] = useState(null);
    const [error, setError] = useState(null);
    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});
    const [totalTxs, setTotalTxs] = useState(-1);

    const getToken = async () => {
        setPagination({...pagination, current: 1});
        setToken(null);
        setTxs(null);
        setError(null);
        try {
            let params = {url: tokenAccount.data.tokenUrl};
            const response = await RPC.request("query", params);
            if (response && response.data) {
                if (!response?.data?.precision) response.data.precision = 0
                setToken(response.data);
            } else {
                throw new Error("Token " + tokenAccount.data.tokenUrl + " not found");
            }
        }
        catch(error) {
            setToken(null);
            setTxs(null);
            setError(error.message);
        }
    }

    const getTxs = async (params = pagination) => {
        setTableIsLoading(true);

        let start = 0;
        let count = 10;
        let showTotalStart = 1;
        let showTotalFinish = 10;

        if (params) {
            start = (params.current-1)*params.pageSize;
            count = params.pageSize;
            showTotalStart = (params.current-1)*params.pageSize+1;
            showTotalFinish = params.current*params.pageSize;
        }

        try {
          const response = await RPC.request("query-tx-history", { url: tokenAccount.data.url, start: start, count: count } );
            if (response && response.items) {

                // workaround API bug response
                if (response.start === null || response.start === undefined) {
                    response.start = 0;
                }

                setTxs(response.items);
            setPagination({...pagination, current: (response.start/response.count)+1, pageSize: response.count, total: response.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.total, showTotalFinish)} of ${response.total}`});
                setTotalTxs(response.total);
            } else {
                throw new Error("Token account not found");
            }
        }
        catch(error) {
            // error is managed by RPC.js, no need to display anything
        }
        setTableIsLoading(false);
    }

    function TxOutputs(props) {
        const data = props.tx;
        const items = data.map((item, index) =>
          <Paragraph key={{index}}>
                {item.url === tokenAccount.data.url ? (
                    <Text type="secondary">{item.url}</Text>
                ) :
                    <nobr>
                        <Link to={'/acc/' + item.url.replace("acc://", "")}>
                            <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{item.url}
                        </Link>
                    </nobr>
                }
            </Paragraph>
        );
        return (
            <span className="break-all">{items}</span>
        );
    }

    function TxAmounts(props) {
        const data = props.tx;
        const items = data.map((item, index) =>
            <Paragraph key={{index}}>
                <Tooltip title={tokenAmountToLocaleString(item.amount, props.token.precision, props.token.symbol)}>
                    {tokenAmount(item.amount, props.token.precision, props.token.symbol)}
                </Tooltip>
            </Paragraph>
        );
        return (
            <span>{items}</span>
        );
    }

    const columns = [
        {
            title: 'Transaction ID',
            dataIndex: 'txid',
            className: 'align-top no-break',
            render: (txid) => {
                if (txid) {
                    return (
                        <Link to={'/acc/' + txid.replace("acc://", "")}>
                            <IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>{txid}
                        </Link>
                    )
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        },
        {
            title: 'Type',
            className: 'align-top no-break',
            render: (tx) => {
                if (tx && tx.type) {
                    return (
                        <div>
                            <Tag color="green">
                                {tx.type}
                            </Tag>
                        {tx.data && tx.data.isRefund ? <Tag color="orange" style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}><RiRefund2Fill/></IconContext.Provider>Refund</Tag> : null}
                        </div>
                    )
                } else {
                    return (
                        <Tag>
                            N/A
                        </Tag>
                    )
                }
            }
        },
        {
            title: 'From',
            className: 'align-top no-break',
            render: (tx) => {
                let from

                if (tx.data.from) from = tx.data.from
                else if (tx.transaction.body.source) from = tx.transaction.body.source

                if (from === undefined) {
                    return (
                        <Text disabled>N/A</Text>
                    )
                } else if (from === tokenAccount.data.url) {
                    return (
                        <Text type="secondary">{from}</Text>
                    )
                } else {
                    return (
                        <Link to={'/acc/' + from.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{from}</Link>
                    )
                }
            }
        },
        {
            title: 'To',
            className: 'align-top no-break',
            render: (tx) => {
                if (tx.data.to || tx.data.recipient) {
                    if (tx.data.to && Array.isArray(tx.data.to) && tx.data.to[0]) {
                        return (
                            <TxOutputs tx={tx.data.to} token={token} />
                        )
                    }
                    if (tx.data.recipient) {
                        if (tx.data.recipient === tokenAccount.data.url) {
                            return (
                                <Text type="secondary">{tx.data.recipient}</Text>
                            )
                        } else {
                            return (
                                <Link to={'/acc/' + tx.data.recipient.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.data.recipient}</Link>
                            )
                        }
                    }
                //special case for acmeFaucet tx type
                } else if (tx.type === 'acmeFaucet' && tx.data.url) {
                    return (
                        <Link to={'/acc/' + tx.data.url.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.data.url}</Link>
                    )
                //special case, with no TO or RECIPIENT address
                } else if ((tx.type === 'syntheticDepositTokens' || tx.type === 'syntheticDepositCredits') && tx.origin) {
                    return (
                        <Text type="secondary">{tx.origin}</Text>
                    )
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        },
        {
            title: 'Amount',
            className: 'align-top no-break',
            dataIndex: 'data',
            render: (data) => {
                if (data.to && Array.isArray(data.to) && data.to[0]) {
                    return (
                        <TxAmounts tx={data.to} token={token} />
                    )
                } else if (data.amount && data.token) {
                    return (
                        <Descriptions.Item>
                            <Tooltip title={tokenAmountToLocaleString(data.amount, token.precision, token.symbol)}>
                                {tokenAmount(data.amount, token.precision, token.symbol)}
                            </Tooltip>
                        </Descriptions.Item>
                    )
                } else if (data.amount && data.oracle) { //if not a TOKEN, then it is a CREDIT
                    return (
                        <Text>{data.amount * data.oracle * 1e-10} credits</Text>
                    )
                }
                else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        },
    ];

    useEffect(() => {
        getToken();
        getTxs();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>

            <Descriptions bordered column={1} size="middle">

                {tokenAccount.type ? (
                    <Descriptions.Item label="Type">
                        {tokenAccount.type}
                    </Descriptions.Item>
                ) :
                    null
                }

            </Descriptions>

            {tokenAccount.data && token ? (
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiInformationLine />
                        </IconContext.Provider>
                        Token Account Info
                    </Title>

                    <Descriptions bordered column={1} size="middle">

                        {tokenAccount.data.url ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.tokenAcctUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>URL</nobr></span>}>
                                {tokenAccount.data.url}
                                {tokenAccount.data.url === FaucetAddress ? (
                                    <Paragraph className="inline-tip">Faucet address</Paragraph>
                                ) :
                                    null
                                }
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {tokenAccount.adi ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.adiUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>ADI</nobr></span>}>
                                <Link to={'/acc/' + tokenAccount.adi.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tokenAccount.adi}
                                </Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {tokenAccount.lightIdentity ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.lightIdentityUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Identity</nobr></span>}>
                                <Link to={'/acc/' + tokenAccount.lightIdentity.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tokenAccount.lightIdentity}
                                </Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {(tokenAccount.data.token && token.symbol) ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.token}><RiQuestionLine /></Tooltip></IconContext.Provider>Token</nobr></span>}>
                                {token.symbol}
                                <br />
                                <Link to={'/acc/' + tokenAccount.data.token.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiCoinLine /></IconContext.Provider>{tokenAccount.data.token}
                                </Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {((tokenAccount.data.balance || tokenAccount.data.balance === 0) && token.precision && token.symbol) ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.balance}><RiQuestionLine /></Tooltip></IconContext.Provider>Balance</nobr></span>}>
                                {tokenAmount(tokenAccount.data.balance, token.precision, token.symbol)}
                                <br /><Text className="formatted-balance">{tokenAmountToLocaleString(tokenAccount.data.balance, token.precision, token.symbol)}</Text>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                    </Descriptions>

                    <Authorities items={tokenAccount.data.authorities} />

                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiExchangeLine />
                        </IconContext.Provider>
                        Transactions
                        <Count count={totalTxs ? totalTxs : 0} />
                    </Title>

                    <Table
                        dataSource={txs}
                        columns={columns}
                        pagination={pagination}
                        rowKey="txid"
                        loading={tableIsLoading}
                        onChange={getTxs}
                        scroll={{ x: 'max-content' }}
                    />

                    {tokenAccount.type !== "liteTokenAccount" ? (
                        <TxChain url={tokenAccount.data.url} type='pending' />
                    ) : null }
                    <TxChain url={tokenAccount.data.url} type='signature' />

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
                                Token Account Info
                            </Title>
                            <div className="skeleton-holder">
                                <Skeleton active />
                            </div>
                            <Title level={4}>
                                <IconContext.Provider value={{ className: 'react-icons' }}>
                                    <RiExchangeLine />
                                </IconContext.Provider>
                                Transactions
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

};

export default TokenAccount;
