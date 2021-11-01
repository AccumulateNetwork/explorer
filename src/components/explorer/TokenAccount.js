import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Skeleton,
  Alert,
  Tooltip,
  Table,
  Tag
} from 'antd';

import { NotifyNetworkError } from './../common/Notifications';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine
} from 'react-icons/ri';

import RPC from './../common/RPC';
import FaucetAddress from './../common/Faucet';

const { Title, Paragraph, Text } = Typography;

const TokenAccount = ({ match }) => {

    const [tokenAccount, setTokenAccount] = useState(null);
    const [token, setToken] = useState(null);
    const [txs, setTxs] = useState(null);
    const [error, setError] = useState(null);
    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});
  
    const getTokenAccount = async (url) => {
        document.title = "Token Account " + url + " | Accumulate Explorer";
        setTokenAccount(null);
        setToken(null);
        setTxs(null);
        setError(null);
        try {
            let params = {url: url};
            const response = await RPC.request("token-account", params);
            if (response.data && response.type === "anonTokenAccount") {
                setTokenAccount(response.data);
            } else {
                throw new Error("Token account not found"); 
            }

            let params2 = {url: response.data.tokenUrl};
            const response2 = await RPC.request("token", params2);
            if (response2.data && response2.type === "token") {
                setToken(response2.data);
            } else {
                throw new Error("Token not found"); 
            }
        }
        catch(error) {
            setTokenAccount(null);
            setToken(null);
            setTxs(null);
            setError("Token account " + url + " not found");
        }
    }

    const getTxs = async (params = pagination) => {
        setTableIsLoading(true);
    
        let start = 0;
        let limit = 10;
        let showTotalStart = 1;
        let showTotalFinish = 10;
    
        if (params) {
            start = (params.current-1)*params.pageSize;
            limit = params.pageSize;
            showTotalStart = (params.current-1)*params.pageSize+1;
            showTotalFinish = params.current*params.pageSize;
        }
    
        try {
          const response = await RPC.request("token-account-history", { url: tokenAccount.url, start: start, limit: limit } );
          if (response.data && response.type === "tokenAccountHistory") {
            response.data.forEach((tx) => {
                if (tx.type === "syntheticTokenDeposit") {
                    let to = {url: tx.data.to, amount: tx.data.amount, txid: tx.data.txid};
                    tx.data.to = [];
                    tx.data.to.push(to);
                }
            });
            setTxs(response.data);
            setPagination({...pagination, current: (response.start/response.limit)+1, pageSize: response.limit, total: response.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.total, showTotalFinish)} of ${response.total}`});
        } else {
            throw new Error("Token account not found"); 
          }
        }
        catch(error) {
            NotifyNetworkError();
        }
        setTableIsLoading(false);
    }

    function TxOutputs(props) {
        const data = props.tx;
        const items = data.map((item, index) =>
          <Paragraph key={{index}}>
            {item.url === tokenAccount.url ? (
                <Text type="secondary">{item.url}</Text>
            ) :
                <Link to={'/accounts/' + item.url.replace("acc://", "")}>
                    {item.url}
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
            {(item.amount/(10**props.token.precision)).toFixed(props.token.precision).replace(/\.0+$/,'')} {props.token.symbol}
          </Paragraph>
      );
      return (
        <span>{items}</span>
      );
    }

    const columns = [
        {
            title: 'Transaction ID',
            dataIndex: 'data',
            className: 'code',
            render: (data) => (
                <Link to={'/tx/' + data.txid}>
                    {data.txid}
                </Link>
                
            )
        },
        {
            title: 'Type',
            dataIndex: 'type',
            render: (type) => (
                <Tag color="green">
                  {type}
                </Tag>
            )
        },
        {
            title: 'From',
            dataIndex: 'data',
            render: (data) => {
                if (data.from === tokenAccount.url) {
                    return (
                        <Text type="secondary">{data.from}</Text>
                    )
                } else {
                    return (
                        <Link to={'/accounts/' + data.from.replace("acc://", "")}>{data.from}</Link>
                    )
                }
            }
        },
        {
            title: 'To',
            dataIndex: 'data',
            render: (data) => {
                if (data.to && Array.isArray(data.to) && data.to[0]) {
                    return (
                        <TxOutputs tx={data.to} token={token} />
                    )
                }
            }
        },
        {
            title: 'Amount',
            dataIndex: 'data',
            render: (data) => {
                if (data.to && Array.isArray(data.to) && data.to[0]) {
                    return (
                        <TxAmounts tx={data.to} token={token} />
                    )
                }
            }
        }
      ];

    useEffect(() => {
        getTokenAccount(match.params.url);
    }, [match.params.url]);

    useEffect(() => {
        if (tokenAccount) {
            getTxs();
        }
    }, [tokenAccount]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <Title level={2}>Token Account</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable>{match.params.url}</Title>
                {tokenAccount && token ? (
                    <div>
                        <Title level={4}>
                          <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiInformationLine />
                          </IconContext.Provider>
                          Token Account Info
                        </Title>
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Token Account URL description"><RiQuestionLine /></Tooltip></IconContext.Provider>Token Account URL</nobr></span>}>
                                {tokenAccount.url}
                                {tokenAccount.url === FaucetAddress ? (
                                    <Paragraph className="inline-tip"><IconContext.Provider value={{ className: 'react-icons' }}><RiInformationLine /></IconContext.Provider>Faucet address</Paragraph>
                                ) : 
                                    null
                                }
                            </Descriptions.Item>
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Token description"><RiQuestionLine /></Tooltip></IconContext.Provider>Token</nobr></span>}>
                                {token.symbol}
                                <br />
                                <Link to={'/tokens/' + tokenAccount.tokenUrl.replace("acc://", "")}>
                                    {tokenAccount.tokenUrl}
                                </Link>
                            </Descriptions.Item>
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Balance description"><RiQuestionLine /></Tooltip></IconContext.Provider>Balance</nobr></span>}>
                                {(tokenAccount.balance/(10**token.precision)).toFixed(token.precision).replace(/\.0+$/,'')} {token.symbol}
                            </Descriptions.Item>
                        </Descriptions>
                        <Title level={4}>
                          <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiInformationLine />
                          </IconContext.Provider>
                          Transactions
                        </Title>

                        <Table
                            dataSource={txs}
                            columns={columns}
                            pagination={pagination}
                            rowKey="txId"
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
                                    <RiInformationLine />
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
}

export default TokenAccount;
