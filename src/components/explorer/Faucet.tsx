import { Alert, Form, Input, Typography } from 'antd';
import React, { useContext, useEffect, useState } from 'react';

import { TxID } from 'accumulate.js';

import { Link } from '../common/Link';
import { Network } from '../common/Network';

const { Title, Paragraph } = Typography;
const { Search } = Input;

const Faucet = () => {
  const [faucetForm] = Form.useForm();
  const [faucetIsLoading, setFaucetIsLoading] = useState(false);
  const [txid, setTxid] = useState<TxID>(null);
  const [error, setError] = useState(null);

  const { api } = useContext(Network);
  const handleFaucet = async (url) => {
    setFaucetIsLoading(true);
    setTxid(null);
    setError(null);

    const response = await api.faucet(url);
    if (response && response?.status?.txID) {
      setTxid(response.status.txID);
    } else {
      setError('Unable to fund ' + url);
    }

    setFaucetIsLoading(false);
  };

  useEffect(() => {
    document.title = 'Faucet | Accumulate Explorer';
  }, []);

  return (
    <div>
      <Title level={2}>Faucet</Title>
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
            onSearch={(value) => {
              if (value !== '') {
                handleFaucet(value);
              }
            }}
            loading={faucetIsLoading}
            spellCheck={false}
            autoComplete="off"
            disabled={faucetIsLoading}
          />
        </Form>
      </Paragraph>
      {txid ? (
        <div>
          <Alert
            type="success"
            message={<Link to={txid}>{txid.toString()}</Link>}
            showIcon
          />
        </div>
      ) : null}
      {error ? (
        <div>
          <Alert type="error" message={error} showIcon />
        </div>
      ) : null}
    </div>
  );
};

export default Faucet;
