import React, { useState, useEffect } from 'react';

import {
  Typography, Alert, Skeleton
} from 'antd';

import RPC from './../common/RPC';
import TxStatus from './../common/TxStatus';
import FaucetTx from './Tx/FaucetTx';
import SynthDepositTokensTx from './Tx/SynthDepositTokensTx';
import SynthDepositCreditsTx from './Tx/SynthDepositCreditsTx';
import SynthCreateChainTx from './Tx/SynthCreateChainTx';
import TokenTx from './Tx/TokenTx';
import CreateIdentityTx from './Tx/CreateIdentityTx';
import CreateTokenAccountTx from './Tx/CreateTokenAccountTx';
import CreateDataAccountTx from './Tx/CreateDataAccountTx';
import SynthGenesisTx from './Tx/SynthGenesisTx';
import WriteDataTx from './Tx/WriteDataTx';
import WriteDataToTx from './Tx/WriteDataToTx';
import AddCreditsTx from './Tx/AddCreditsTx';
import SegWitDataEntryTx from './Tx/SegWitDataEntryTx';

const { Title } = Typography;

const Tx = ({ match }) => {

    const [tx, setTx] = useState(null);
    const [error, setError] = useState(null);

    const getTx = async (hash) => {
        document.title = "Transaction " + hash + " | Accumulate Explorer";
        setTx(null);
        setError(null);
        try {

            let params = {txid: hash};
            const response = await RPC.request("query-tx", params);
            if (response && response.data) {
                if (response.type === "syntheticTokenDeposit") {
                    let to = {url: response.data.to, amount: response.data.amount, txid: response.data.txid};
                    response.data.to = [];
                    response.data.to.push(to);
                }
                setTx(response);
            } else {
                throw new Error("Transaction " + hash + " not found"); 
            }

        }
        catch(error) {
            setTx(null);
            setError(error.message);
        }
    }

    function Render(props) {
        if (props.data) {
            switch(props.data.type) {
                case 'acmeFaucet':
                    return <FaucetTx data={props.data} />;
                case 'syntheticGenesis':
                    return <SynthGenesisTx data={props.data} />;
                case 'genesis':
                    return <SynthGenesisTx data={props.data} />;
                case 'syntheticDepositTokens':
                    return <SynthDepositTokensTx data={props.data} />;
                case 'syntheticDepositCredits':
                    return <SynthDepositCreditsTx data={props.data} />;
                case 'syntheticCreateChain':
                    return <SynthCreateChainTx data={props.data} />;
                case 'sendTokens':
                    return <TokenTx data={props.data} />;
                case 'createIdentity':
                    return <CreateIdentityTx data={props.data} />;
                case 'createTokenAccount':
                    return <CreateTokenAccountTx data={props.data} />;
                case 'createDataAccount':
                    return <CreateDataAccountTx data={props.data} />;
                case 'writeData':
                    return <WriteDataTx data={props.data} />;
                case 'writeDataTo':
                    return <WriteDataToTx data={props.data} />;
                case 'segWitDataEntry':
                    return <SegWitDataEntryTx data={props.data} />;
                case 'addCredits':
                    return <AddCreditsTx data={props.data} />;
                default:
                    return <Alert message="Transaction found, but this transaction type is not supported by the explorer yet" type="warning" showIcon />
            }
        }
        return <Alert message="Chain does not exist" type="error" showIcon />
    }

    useEffect(() => {
        getTx(match.params.hash);
    }, [match.params.hash]);

    return (
        <div>
            <Title level={2}>Transaction</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable>{match.params.hash}</Title>
                {tx ? (
                    <div>
                        <TxStatus data={tx}/>
                        <Render data={tx} />
                    </div>
                ) :
                    <div>
                        {error ? (
                            <div className="skeleton-holder">
                                <Alert message={error} type="error" showIcon />
                            </div>
                        ) :
                            <div className="skeleton-holder">
                                <Skeleton active />
                            </div>
                        }
                    </div>
                }
        </div>
    );
}

export default Tx;
