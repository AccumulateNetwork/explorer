import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Input,
  Alert,
  Form
} from 'antd';

import RPC from './../common/RPC';
import FaucetAddress from './../common/Faucet';

const { Title, Paragraph } = Typography;
const { Search } = Input;

const Faucet = () => {

    const [faucetForm] = Form.useForm();
    const [faucetIsLoading, setFaucetIsLoading] = useState(false);
    const [txid, setTxid] = useState(null);
    const [error, setError] = useState(null);
  
    const handleFaucet = async (url) => {
        setFaucetIsLoading(true);
        setTxid(null);
        setError(null);

        let params = {account: url};
        const response = await RPC.request("faucet", params, 'v3');
        if (response && response?.status?.txID) {
            setTxid("Txid: " + response?.status?.txID);
        } else {
            setError("Unable to fund " + url);
        }

        setFaucetIsLoading(false);

    };

    useEffect(() => {
        document.title = "Faucet | Accumulate Explorer";
    }, []);
  
    return (
        <div>
            <Title level={2}>Faucet</Title>
            <Paragraph style={{marginTop: -10}}>
                <Link to={'/acc/' + FaucetAddress.replace("acc://", "")}>
                    {FaucetAddress}
                </Link>
            </Paragraph>
            <Paragraph>
                <Alert message="This is the testnet faucet" type="info" showIcon />
            </Paragraph>
            <Paragraph>
            <Form form={faucetForm} initialValues={{ search: '' }}>
                <Search
                    placeholder="Enter token account"
                    allowClear
                    enterButton="Get ACME"
                    size="large"
                    onSearch={(value) => { if (value!=='') { handleFaucet(value); } }}
                    loading={faucetIsLoading}
                    spellCheck={false}
                    autoComplete="off"
                    disabled={faucetIsLoading}
              />
            </Form>
            </Paragraph>
            {txid ? (
                <div><Alert type="success" message={txid} showIcon /></div>
            ) : 
                null
            }
            {error ? (
                <div><Alert type="error" message={error} showIcon /></div>
            ) : 
                null
            }
        </div>
    );
}

export default Faucet;
