import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Typography,
} from 'antd';
import { useState } from 'react';
import React from 'react';

import { URLArgs } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import {
  LiteTokenAccount,
  TokenAccount,
  TokenIssuer,
} from 'accumulate.js/lib/core';

import { isRecordOf } from '../../utils/types';
import { TokenAmount } from '../common/Amount';
import { unwrapError } from '../common/ShowError';
import { queryEffect } from '../common/query';
import { useWeb3 } from './Account';
import { Sign } from './Sign';

const { Text, Paragraph } = Typography;

interface Fields {
  from: string;
  to: string;
  amount: number;
}

export function SendTokens(props: {
  from: URLArgs;
  open: boolean;
  signer?: Sign.Signer;
  onCancel: () => any;
  onFinish: () => any;
}) {
  const account = useWeb3();
  const { open, onCancel, onFinish, signer } = props;
  const [form] = Form.useForm<Fields>();
  const [toSign, setToSign] = useState<Sign.Request>();
  const [pending, setPending] = useState(false);

  const setError = (field: string, error: any) => {
    form.setFields([
      {
        name: field,
        errors: [unwrapError(error) || `An unknown error occurred`],
      },
    ]);
  };

  const clearError = (field: string) => {
    form.setFields([{ name: field, errors: [] }]);
  };

  // Load the sender
  const fromUrl = props.from || Form.useWatch('from', form);
  const [from, setFrom] = useState<TokenAccount | LiteTokenAccount>();
  queryEffect(fromUrl).then((r) => {
    if (r.recordType == RecordType.Error) {
      setError('from', r.value);
      return;
    }

    if (!isRecordOf(r, TokenAccount, LiteTokenAccount)) {
      setError('from', `${fromUrl} is not a token account`);
      return;
    }

    setFrom(r.account);
    clearError('from');
  });

  // Load the issuer
  const [issuer, setIssuer] = useState<TokenIssuer>();
  queryEffect(from?.tokenUrl).then((r) => {
    if (r.recordType == RecordType.Error) {
      setError('from', r.value);
      return;
    }

    if (!isRecordOf(r, TokenIssuer)) {
      setError('from', 'Unable to load the token type');
      return;
    }

    setIssuer(r.account);
    clearError('from');
  });

  const toUrl = Form.useWatch('to', form);
  const [to, setTo] = useState<TokenAccount | LiteTokenAccount>();
  queryEffect(toUrl).then((r) => {
    if (r.recordType == RecordType.Error) {
      setError('to', r.value);
      return;
    }

    if (!isRecordOf(r, TokenAccount, LiteTokenAccount)) {
      setError('to', `${toUrl} is not a token account`);
      return;
    }

    setTo(r.account);
    clearError('to');
  });

  const submit = async ({ from, to, amount }: Fields) => {
    amount *= 10 ** issuer.precision;
    setPending(true);
    try {
      await Sign.submit(
        setToSign,
        {
          header: {
            principal: from,
          },
          body: {
            type: 'sendTokens',
            to: [{ url: to, amount }],
          },
        },
        signer,
      );
      onFinish();
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      title="Send tokens"
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
        requiredMark={false}
        disabled={pending}
        onFinish={submit}
        initialValues={{
          from: props.from,
        }}
      >
        <Form.Item label="Sender">
          <Form.Item noStyle name="from" rules={[{ required: true }]}>
            {props.from ? (
              <Input readOnly />
            ) : (
              <Select placeholder="Choose token account">
                {account && (
                  <Select.Option
                    value={`${account.liteIdUrl}/ACME`}
                  >{`${account.liteIdUrl}/ACME`}</Select.Option>
                )}
              </Select>
            )}
          </Form.Item>
          {from && issuer && (
            <Paragraph style={{ marginTop: 5, marginBottom: 0 }}>
              <Text type="secondary">
                Available balance:{' '}
                <TokenAmount amount={from.balance} issuer={issuer} />
              </Text>
            </Paragraph>
          )}
        </Form.Item>
        <Form.Item label="Recipient" name="to" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Amount" name="amount" rules={[{ required: true }]}>
          <InputNumber
            min={0}
            max={issuer && Number(from.balance) / 10 ** issuer.precision}
            addonAfter={issuer?.symbol || issuer?.url?.toString()}
          />
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
