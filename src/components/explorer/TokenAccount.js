import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Skeleton,
  Alert,
  Tooltip
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine
} from 'react-icons/ri';

import RPC from './../common/RPC';

const { Title } = Typography;

const TokenAccount = ({ match }) => {

    const [tokenAccount, setTokenAccount] = useState(null);
    const [error, setError] = useState(null);

    const getTokenAccount = async (url) => {
        document.title = "Token Account " + url + " | Accumulate Explorer";
        setTokenAccount(null);
        setError(null);
        try {
            let params = {url: url};
            const response = await RPC.request("token-account", params);
            if (response.data && response.type === "anonTokenAccount") {
                setTokenAccount(response.data);
            } else {
                throw new Error("Token account not found"); 
            }
        }
        catch(error) {
            setTokenAccount(null);
            setError("Token account " + url + " not found");
        }
    }

    useEffect(() => {
        getTokenAccount(match.params.url);
    }, [match.params.url]);

    return (
        <div>
            <Title level={2}>Token Account</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable>{match.params.url}</Title>
                {tokenAccount ? (
                    <div>
                        <Title level={4}>
                          <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiInformationLine />
                          </IconContext.Provider>
                          Token Account Info
                        </Title>
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="URL description"><RiQuestionLine /></Tooltip></IconContext.Provider>URL</nobr></span>}>
                                {tokenAccount.url}
                            </Descriptions.Item>
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Token URL description"><RiQuestionLine /></Tooltip></IconContext.Provider>Token URL</nobr></span>}>
                                <Link to={'/tokens/' + tokenAccount.tokenURL.replace("acc://", "")}>
                                    {tokenAccount.tokenURL}
                                </Link>
                            </Descriptions.Item>
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Balance description"><RiQuestionLine /></Tooltip></IconContext.Provider>Balance</nobr></span>}>
                                <span className="code">{tokenAccount.balance}</span>
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
                                  Token Account Info
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