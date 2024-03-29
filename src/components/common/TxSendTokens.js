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
import TxTo from './TxTo';
import getToken from './GetToken';

const { Title } = Typography;

const TxSendTokens = props => {

    const tx = props.data;
    const [tokenAccount, setTokenAccount] = useState(null);
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);

    const getTokenAccount = async () => {
        setTokenAccount(null);
        setError(null);
        try {
            const response = await RPC.request("query", { "scope": tx.data.from }, 'v3');
            if (response && response.account) {
                setTokenAccount(response.account);
            } else {
                throw new Error("Token account " + tx.data.from + " not found"); 
            }
        }
        catch(error) {
            setTokenAccount(null);
            setError(error.message);
        }
    }
    
    useEffect(() => {
        if (tokenAccount?.tokenUrl)
            getToken(tokenAccount.tokenUrl, setToken, setError);
    }, [tokenAccount]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        getTokenAccount();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>

        <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiInformationLine />
            </IconContext.Provider>
            Token Transaction
        </Title>

        {tx && tx.data ? (
            <Descriptions bordered column={1} size="middle">

                <Descriptions.Item label={"Token"}>
                    {tokenAccount && tokenAccount.tokenUrl ? (
                        <Link to={'/acc/' + tokenAccount.tokenUrl.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiCoinLine /></IconContext.Provider>{tokenAccount.tokenUrl}</Link>
                        ) : 
                        <Skeleton active paragraph={false} />
                    }
                </Descriptions.Item>

                {tx.data.from ? (
                    <Descriptions.Item label={"From"}>
                        <Link to={'/acc/' + tx.data.from.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.data.from}</Link>
                    </Descriptions.Item>
                ) :
                    null
                }

                {tx.data.to ? (
                    <Descriptions.Item label={"To"} className={"align-top"}>
                        {(tokenAccount && token) &&
                            <TxTo data={tx.data.to} token={token} />
                        }
                        {error &&
                            <Alert message={error} type="error" showIcon />  
                        }
                        {(!error && !(tokenAccount && token)) &&
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

export default TxSendTokens;