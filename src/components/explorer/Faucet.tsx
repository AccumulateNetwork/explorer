import { Alert, Form, Input, Typography } from 'antd';
import React, {
  MouseEventHandler,
  useContext,
  useEffect,
  useState,
} from 'react';

import { TxID } from 'accumulate.js';
import { Submission } from 'accumulate.js/lib/api_v3';

import { Link } from '../common/Link';
import { Network } from '../common/Network';
import { Sign } from '../form/Sign';

const { Title, Paragraph } = Typography;
const { Search } = Input;

const Faucet = () => {
  const [form] = Form.useForm();
  const [rq, setRq] = useState<Sign.WaitForRequest<Submission>>();
  Sign.waitFor;

  const { api } = useContext(Network);
  const submit = async (url?: string) => {
    if (!url) return;
    await Sign.waitFor(setRq, () => api.faucet(url, { token: 'ACME' }));
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
        <Form form={form} initialValues={{ search: '' }}>
          <Search
            placeholder="Enter token account"
            allowClear
            enterButton="Get ACME"
            size="large"
            onSearch={submit}
            spellCheck={false}
            autoComplete="off"
          />
        </Form>
      </Paragraph>
      <Sign.WaitFor title="Faucet" canCloseEarly request={rq} />
    </div>
  );
};

export default Faucet;
