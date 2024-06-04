import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Typography,
} from 'antd';
import { sign } from 'eth-crypto';
import React, { useContext, useState } from 'react';
import { RiQuestionLine } from 'react-icons/ri';

import { RecordType } from 'accumulate.js/lib/api_v3';
import { LiteTokenAccount } from 'accumulate.js/lib/core';

import { isRecordOf } from '../../utils/types';
import { TokenAmount } from '../common/Amount';
import { Shared } from '../common/Network';
import { ShowError } from '../common/ShowError';
import { WithIcon } from '../common/WithIcon';
import { queryEffect } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { Sign } from '../web3/Sign';
import { useWeb3 } from './Account';

const { Text, Paragraph } = Typography;

interface Fields {
  tokenAccount: string;
  recipient: string;
  credits: number;
  oracle: number;
  tokens: number;
}

export function AddCredits({
  open,
  onCancel,
  onFinish,
}: {
  open: boolean;
  onCancel: () => any;
  onFinish: () => any;
}) {
  const account = useWeb3();
  const [form] = Form.useForm<Fields>();
  const [toSign, setToSign] = useState<Sign.Request>();
  const [pending, setPending] = useState(false);

  // Get the oracle
  const { api } = useContext(Shared);
  useAsyncEffect(async (mounted) => {
    form.setFields([{ name: 'oracle', errors: [] }]);
    try {
      const r = await api.networkStatus({});
      if (!mounted()) {
        return;
      }
      form.setFieldsValue({ oracle: r?.oracle?.price });
    } catch (error) {
      console.log(error);
      form.setFields([
        {
          name: 'oracle',
          errors: ['Failed to fetch oracle'],
        },
      ]);
    }
  }, []);

  // Query the token account
  const [tokenAccountUrl, setTokenAccountUrl] = useState<string>();
  const [tokenAccount, setTokenAccount] = useState<LiteTokenAccount>();
  const [tokenAccountError, setTokenAccountError] = useState<any>();

  queryEffect(tokenAccountUrl)
    .then((r) => {
      if (r.recordType === RecordType.Error) {
        setTokenAccountError(r.value);
        return;
      }
      if (
        !isRecordOf(r, LiteTokenAccount) ||
        r.account.tokenUrl.toString().toLowerCase() !== 'acc://acme'
      ) {
        setTokenAccountError(
          `An unexpected error occurred while fetching ${tokenAccountUrl}`,
        );
        return;
      }
      setTokenAccount(r.account);
    })
    .catch(setTokenAccountError);

  // Calculate the ACME amount
  const changed = ({ oracle, credits }: Fields) => {
    if (!oracle || isNaN(oracle)) {
      return;
    }
    if (!credits || isNaN(credits)) {
      return;
    }
    const tokens = ((credits * 100) / oracle) * 10 ** 8;
    form.setFieldsValue({ tokens });
  };

  // Submit the transaction
  const submit = async ({
    tokenAccount,
    recipient,
    tokens,
    oracle,
  }: Fields) => {
    setPending(true);
    try {
      await Sign.submit(setToSign, {
        header: {
          principal: tokenAccount,
        },
        body: {
          type: 'addCredits',
          recipient,
          amount: tokens,
          oracle,
        },
      });
      onFinish();
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      title={
        <WithIcon after icon={RiQuestionLine} tooltip="Convert ACME to tokens">
          Add Credits
        </WithIcon>
      }
      open={open}
      onCancel={onCancel}
      footer={false}
      forceRender
      closable={!pending}
      maskClosable={!pending}
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        requiredMark={false}
        disabled={pending}
        onFinish={submit}
        onValuesChange={(_, v) => changed(v)}
      >
        <Form.Item
          label="Price Oracle"
          className="text-row"
          name="oracle"
          rules={[{ required: true }]}
        >
          <InputNumber
            addonBefore="1 ACME ="
            addonAfter="credits"
            readOnly
            formatter={(v) => `${Number(v) / 100}`}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item label="ACME Token Account">
          <Form.Item noStyle name="tokenAccount" rules={[{ required: true }]}>
            <Select
              placeholder="Choose token account"
              onChange={(e) => setTokenAccountUrl(e)}
            >
              {account && (
                <Select.Option
                  value={`${account.liteIdUrl}/ACME`}
                >{`${account.liteIdUrl}/ACME`}</Select.Option>
              )}
            </Select>
          </Form.Item>
          {tokenAccount && (
            <Paragraph style={{ marginTop: 5, marginBottom: 0 }}>
              <Text type="secondary">
                Available balance:{' '}
                <TokenAmount amount={tokenAccount?.balance} issuer={'ACME'} />
              </Text>
            </Paragraph>
          )}
          {tokenAccountError && <ShowError error={tokenAccountError} />}
        </Form.Item>
        <Form.Item
          label="Credits Destination"
          name="recipient"
          rules={[{ required: true }]}
        >
          <Select placeholder="Choose credits destination">
            {account && (
              <Select.Option value={account.liteIdUrl.toString() || ''}>
                {account.liteIdUrl.toString()}
              </Select.Option>
            )}
          </Select>
        </Form.Item>
        <Form.Item label="Amount">
          <Form.Item noStyle name="credits" rules={[{ required: true }]}>
            <InputNumber
              placeholder="100"
              min={1}
              style={{ width: '100%' }}
              addonAfter={
                <span>
                  credits ={' '}
                  <TokenAmount
                    bare
                    amount={Form.useWatch('tokens', form)}
                    issuer="ACME"
                  />
                </span>
              }
            />
          </Form.Item>
          <Form.Item noStyle name="tokens">
            <Input type="hidden" />
          </Form.Item>
        </Form.Item>
        <Form.Item>
          <Button
            htmlType="submit"
            type="primary"
            shape="round"
            size="large"
            loading={pending}
            children="Submit"
          />
        </Form.Item>
      </Form>

      <Sign request={toSign} />
    </Modal>
  );
}
