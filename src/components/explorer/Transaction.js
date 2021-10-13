import React, { useState, useEffect } from 'react';

import {
  Typography,
} from 'antd';

import axios from 'axios';

import { NotifyNetworkError } from './../common/Notifications';

const { Title } = Typography;

const Transaction = ({ match }) => {

    const [tx, setTx] = useState(null);
    const [error, setError] = useState(null);

    const getTx = async (hash) => {
        document.title = "Transaction " + hash + " | Accumulate Explorer";
        setTx(null);
        setError(null);
        try {
            const response = await axios.get('/'+hash);
            if (response.data.result.type === "tx") {
                setTx(response.data.result.data);
            } else {
                setError("Transaction " + hash + " not found");
            }
        }
        catch(error) {
            setTx(null);
            if (error.response) {
                setError(error.response.data.error);
            } else {
                NotifyNetworkError();
            }
        }
    }

    useEffect(() => {
        getTx(match.params.hash);
    }, [match.params.hash]);

    return (
        <div>
            <Title level={2}>Transaction</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable>{match.params.hash}</Title>
        </div>
    );
}

export default Transaction;
