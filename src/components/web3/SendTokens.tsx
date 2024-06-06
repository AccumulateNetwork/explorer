import { Button, Form, InputNumber, Modal, Typography } from 'antd';
import { useEffect, useState } from 'react';
import React from 'react';

import { URLArgs } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import {
  LiteTokenAccount,
  TokenAccount,
  TokenIssuer,
} from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { isRecordOf } from '../../utils/types';
import { TokenAmount } from '../common/Amount';
import { unwrapError } from '../common/ShowError';
import { queryEffect } from '../common/query';
import { InputTokenAccount } from './InputAccount';
import { Sign } from './Sign';

const { Text, Paragraph } = Typography;

interface Fields {
  from: TokenAccount | LiteTokenAccount;
  to: TokenAccount | LiteTokenAccount;
  amount: number;
}

export function SendTokens({
  open,
  onCancel,
  onFinish,
  signer,
  ...props
}: {
  from?: URLArgs;
  to?: URLArgs;
  open: boolean;
  signer?: Sign.Signer;
  onCancel: () => any;
  onFinish: () => any;
}) {
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

  const from = Form.useWatch('from', form);
  const to = Form.useWatch('to', form);
  useEffect(() => {
    if (from?.tokenUrl && to?.tokenUrl && !from.tokenUrl.equals(to.tokenUrl)) {
      setError('to', `Cannot send ${issuer.symbol || issuer.url} to ${to.url}`);
    }
  }, [`${from?.tokenUrl}`, `${to?.tokenUrl}`]);

  // Load the issuer
  const [issuer, setIssuer] = useState<TokenIssuer>();
  queryEffect(from?.tokenUrl).then((r) => {
    if (r.recordType == RecordType.Error) {
      if (r.value.code === Status.NotFound) {
        setError('from', 'Unable to load the token type');
      } else {
        setError('from', r.value);
      }
      return;
    }

    if (!isRecordOf(r, TokenIssuer)) {
      setError('from', 'Unable to load the token type');
      return;
    }

    setIssuer(r.account);
    clearError('from');
  });

  const submit = async ({ from, to, amount }: Fields) => {
    amount *= 10 ** issuer.precision;
    setPending(true);
    try {
      await Sign.submit(
        setToSign,
        {
          header: {
            principal: from.url,
          },
          body: {
            type: 'sendTokens',
            to: [{ url: to.url, amount }],
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
      >
        <Form.Item label="Sender">
          <InputTokenAccount
            name="from"
            noStyle
            readOnly={!!props.from}
            initialValue={props.from}
            rules={[{ required: true }]}
          />
          {from && issuer && (
            <Paragraph style={{ marginTop: 5, marginBottom: 0 }}>
              <Text type="secondary">
                Available balance:{' '}
                <TokenAmount amount={from.balance} issuer={issuer} />
              </Text>
            </Paragraph>
          )}
        </Form.Item>
        <InputTokenAccount
          label="Recipient"
          name="to"
          allowMissingLite
          readOnly={!!props.to}
          initialValue={props.to}
          rules={[{ required: true }]}
        />
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
