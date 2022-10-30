import React, { useState, useEffect } from 'react';

import {
  Typography, Alert, Skeleton
} from 'antd';

import RPC from './../common/RPC';
import GenericTx from './Tx/GenericTx';

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
            return <GenericTx data={props.data} />;
        }
        return <Alert message="Tx does not exist" type="error" showIcon />
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
