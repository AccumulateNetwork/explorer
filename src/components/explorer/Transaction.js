import React, { useState, useEffect } from 'react';

import {
  Typography, Alert, Skeleton
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine
} from 'react-icons/ri';

import RPC from './../common/RPC';
import TokenTransaction from './transaction/TokenTransaction';
import CreditTransaction from './transaction/CreditTransaction';

const { Title } = Typography;

const Transaction = ({ match }) => {

    const [tx, setTx] = useState(null);
    const [isSynth, setIsSynth] = useState(false);
    const [isCredit, setIsCredit] = useState(false);
    const [tokenAccount, setTokenAccount] = useState(null);
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);

    const getTx = async (hash) => {
        document.title = "Transaction " + hash + " | Accumulate Explorer";
        setTx(null);
        setIsSynth(false);
        setIsCredit(false);
        setTokenAccount(null);
        setToken(null);
        setError(null);
        try {

            let params = {hash: hash};
            const response = await RPC.request("token-tx", params);
            if (response.data && (response.type === "tokenTx" || response.type === "syntheticTokenDeposit")) {
                if (response.type === "syntheticTokenDeposit") {
                    setIsSynth(true);
                    let to = {url: response.data.to, amount: response.data.amount, txid: response.data.txid};
                    response.data.to = [];
                    response.data.to.push(to);
                }
                setTx(response.data);
            } else {
                throw new Error("Transaction " + hash + " not found"); 
            }

            let params2 = {url: response.data.from};
            const response2 = await RPC.request("token-account", params2);
            if (response2.data && response2.type === "anonTokenAccount") {
                setTokenAccount(response2.data);
            } else {
                throw new Error("Token Account " + response.data.from + " not found"); 
            }

            let params3 = {url: response2.data.tokenUrl};
            const response3 = await RPC.request("token", params3);
            if (response3.data && response3.type === "token") {
                setToken(response3.data);
            } else {
                throw new Error("Token " + response2.data.tokenUrl + " not found"); 
            }

        }
        catch(error) {
            setTx(null);
            setIsSynth(false);
            setIsCredit(false);
            setTokenAccount(null);
            setToken(null);
            getCreditTx(hash);
        }
    }

    const getCreditTx = async (hash) => {
        document.title = "Transaction " + hash + " | Accumulate Explorer";
        setTx(null);
        setIsSynth(false);
        setTokenAccount(null);
        setToken(null);
        setError(null);
        try {

            let params = {hash: hash};
            const response = await RPC.request("add-credits", params);
            if (response.data && (response.type === "addCredits" || response.type === "syntheticDepositCredits")) {
                if (response.type === "syntheticDepositCredits") {
                    setIsSynth(true);
                    let to = {url: response.data.to, amount: response.data.amount, txid: response.data.txid};
                    response.data.to = [];
                    response.data.to.push(to);
                }
                setTx(response.data);
            } else {
                throw new Error("Transaction " + hash + " not found"); 
            }

            let params2 = {url: response.data.from};
            const response2 = await RPC.request("token-account", params2);
            if (response2.data && response2.type === "anonTokenAccount") {
                setTokenAccount(response2.data);
            } else {
                throw new Error("Token Account " + response.data.from + " not found"); 
            }

        }
        catch(error) {
            setTx(null);
            setIsSynth(false);
            setIsCredit(false);
            setTokenAccount(null);
            setToken(null);
            setError(error.message);
        }
    }

    useEffect(() => {
        getTx(match.params.hash);
    }, [match.params.hash]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <Title level={2}>Transaction</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable>{match.params.hash}</Title>

                {tx && tokenAccount && (isCredit || token) ? (
                    <div>
                        {(!isCredit) ? (
                            <TokenTransaction tx={tx} token={token} isSynth={isSynth} />
                        ) :
                            <CreditTransaction tx={tx} token={token} isSynth={isSynth} />
                        }
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
                                  Transaction Info
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

export default Transaction;
