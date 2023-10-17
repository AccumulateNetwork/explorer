import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { Link } from 'react-router-dom';

import {
    Typography,
    Descriptions,
    Tooltip,
    Tag,
    Table,
    Alert,
    Skeleton,
    message
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiAccountCircleLine, RiExchangeLine, RiCoinLine
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
    if (tokenAccount.data && !tokenAccount.data.balance) tokenAccount.data.balance = 0;
    const [token, setToken] = useState(null);
    const [txs, setTxs] = useState(null);
    const [stakingAccount, setStakingAccount] = useState(null);
    const [error, setError] = useState(null);
    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});
    const [totalTxs, setTotalTxs] = useState(-1);

    //TODO Refactor
    const getToken = async () => {
        setPagination({...pagination, current: 1});
        setToken(null);
        setTxs(null);
        setError(null);
        try {
            const response = await RPC.request("query", { "scope": tokenAccount.data.tokenUrl }, 'v3');
            if (response) {
                if (!response?.account?.precision) response.account.precision = 0
                setToken(response);
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

        if (params) {
            start = (params.current-1)*params.pageSize;
        }

        try {
            const response = await RPC.request("query", { "scope": tokenAccount.data.url, "query": { "queryType": "chain", "name": "main", "range": { "fromEnd": true, "expand": true, "count": params.pageSize, start } } }, 'v3' );
            if (response?.records) {

                // workaround API bug response
                if (response.start === null || response.start === undefined) {
                    response.start = 0;
                }

                setTxs(response.records.reverse());
                setPagination({...pagination, current: params.current, pageSize: params.pageSize, total: response.total});
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

    const getStakingInfo = async (url) => {
        if (!process.env.REACT_APP_METRICS_API_PATH) return

        try {
            const response = await axios.get(process.env.REACT_APP_METRICS_API_PATH + "/staking/stakers/" + url);
            if (response && response.data && !response.data.error) {
                setStakingAccount(response.data);
            }
        }
        catch(error) {
            // no need to setError here, because an error won't prevent rendering of the page
            message.error("Can not get staking data from Metrics API");
        }
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
            title: '#',
            className: 'align-top no-break',
            render: (row) => {
                if (row?.index >= 0) {
                    return (
                        <div>
                            <Text>{row.index}</Text>
                        </div>
                    )
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }                
            }
        },
        {
            title: 'Transaction ID',
            dataIndex: 'entry',
            className: 'align-top no-break',
            render: (entry) => {
                if (entry) {
                    return (
                        <Link to={'/acc/' + entry + '@' + tokenAccount.data.url.replace("acc://", "")}>
                            <IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>{entry}
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
                const type = tx?.value?.message?.transaction?.body?.type
                if (type) {
                    return (
                        <div>
                            <Tag color="green">
                                {type}
                            </Tag>
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
                const from = tx?.value?.message?.transaction?.body?.source || tx?.value?.message?.transaction?.header?.principal

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
                const to = tx?.value?.message?.transaction?.body?.to
                const recipient = tx?.value?.message?.transaction?.body?.recipient || tx?.value?.message?.transaction?.header?.principal
                if (to || recipient) {
                    if (to && Array.isArray(to) && to[0]) {
                        return (
                            <TxOutputs tx={to} token={token} />
                        )
                    }
                    if (recipient) {
                        if (recipient === tokenAccount.data.url) {
                            return (
                                <Text type="secondary">{recipient}</Text>
                            )
                        } else {
                            return (
                                <Link to={'/acc/' + recipient.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{recipient}</Link>
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
            render: (tx) => {
                const to = tx?.value?.message?.transaction?.body?.to
                const amount = tx?.value?.message?.transaction?.body?.amount
                if (to && Array.isArray(to) && to[0] && token) {
                    return (
                        <TxAmounts tx={to} token={token} />
                    )
                } else if (amount && token) {
                    return (
                        <Descriptions.Item>
                            <Tooltip title={tokenAmountToLocaleString(amount, token.precision, token.symbol)}>
                                {tokenAmount(amount, token.precision, token.symbol)}
                            </Tooltip>
                        </Descriptions.Item>
                    )
                } else if (amount && tx.oracle) { //if not a TOKEN, then it is a CREDIT - NOT WORKING
                    return (
                        <Text>{amount * tx.oracle * 1e-10} credits</Text>
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
        getStakingInfo(tokenAccount.data.url);
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

                        {((tokenAccount.data.balance || tokenAccount.data.balance === 0) && token.symbol) ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.balance}><RiQuestionLine /></Tooltip></IconContext.Provider>Balance</nobr></span>}>
                                {tokenAmount(tokenAccount.data.balance, token.precision, token.symbol)}
                                <br /><Text className="formatted-balance">{tokenAmountToLocaleString(tokenAccount.data.balance, token.precision, token.symbol)}</Text>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {stakingAccount && stakingAccount.type ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.stakingType}><RiQuestionLine /></Tooltip></IconContext.Provider>Staking Type</nobr></span>}>
                                <Tag color={stakingAccount.type ? "green" : "cyan"}>{stakingAccount.type}</Tag>
                                {stakingAccount.delegate ? (
                                    <Link to={'/acc/' + stakingAccount.delegate.replace("acc://", "")}>
                                        <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{stakingAccount.delegate}
                                    </Link>
                                ) :
                                    null
                                }
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {stakingAccount && stakingAccount.rewards ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.stakingRewards}><RiQuestionLine /></Tooltip></IconContext.Provider>Staking Rewards</nobr></span>}>
                                <Link to={'/acc/' + stakingAccount.rewards.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{stakingAccount.rewards}
                                </Link>
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
