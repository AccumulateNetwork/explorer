import React, { useState, useEffect } from 'react';

import {
  Typography, Descriptions, Tooltip, Alert, Skeleton
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine
} from 'react-icons/ri';


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
                {tx ? (
                    <div>
                        <Title level={4}>
                          <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiInformationLine />
                          </IconContext.Provider>
                          Transaction Info
                        </Title>
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Tx hash description"><RiQuestionLine /></Tooltip></IconContext.Provider>Hash</nobr></span>}>
                                {tx.hash}
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
