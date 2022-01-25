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
    RiInformationLine, RiQuestionLine, RiAccountCircleLine, RiExchangeLine, RiCoinLine, RiLinksLine
} from 'react-icons/ri';

import RPC from '../../common/RPC';
import tooltipDescs from '../../common/TooltipDescriptions';
import FaucetAddress from '../../common/Faucet';
import Count from '../../common/Count';

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
            let params = {url: tokenAccount.data.token};
            const response = await RPC.request("query", params);
            if (response && response.data) {
                setToken(response.data);
            } else {
                throw new Error("Token " + response.data.token + " not found"); 
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
                <Link to={'/acc/' + item.url.replace("acc://", "")}>
                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{item.url}
                </Link>
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
            {(item.amount/(10**props.token.precision)).toFixed(props.token.precision).replace(/\.?0+$/, "")} {props.token.symbol}
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
            className: 'code',
            render: (txid) => {
                if (txid) {
                    return (
                        <Link to={'/tx/' + txid}>
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
            dataIndex: 'type',
            render: (type) => {
                if (type) {
                    return (
                        <Tag color="green">
                            {type}
                        </Tag>
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
            render: (tx) => {
                let from

                if (tx.data.from) from = tx.data.from
                else if (tx.origin) from = tx.origin

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
            dataIndex: 'data',
            render: (data) => {
                if (data.to || data.amount) {
                    if (data.to && Array.isArray(data.to) && data.to[0]) {
                        return (
                            <TxAmounts tx={data.to} token={token} />
                        )
                    }
                    if (data.amount) {
                        return (
                            <Text>{data.amount} credits</Text>
                        )
                    }
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        }
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

                        {tokenAccount.data.keyBook && parseInt(tokenAccount.data.keyBook, 10) > 0 ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyBook}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Book</nobr></span>}>
                                <Link to={'/chain/' + tokenAccount.data.keyBook}><IconContext.Provider value={{ className: 'react-icons' }}><RiLinksLine /></IconContext.Provider>{tokenAccount.data.keyBook}</Link>
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
                                {(tokenAccount.data.balance/(10**token.precision)).toFixed(token.precision).replace(/\.?0+$/, "")} {token.symbol}
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {(tokenAccount.data.creditBalance || tokenAccount.data.creditBalance === 0) ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.creditBalance}><RiQuestionLine /></Tooltip></IconContext.Provider>Credit Balance</nobr></span>}>
                                {tokenAccount.data.creditBalance} credits
                            </Descriptions.Item>
                        ) :
                            null
                        }

                    </Descriptions>
                    
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
