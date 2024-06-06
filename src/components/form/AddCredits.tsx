import { Button, Form, Input, InputNumber, Modal, Typography } from 'antd';
import React, { useContext, useEffect, useState } from 'react';
import { RiQuestionLine } from 'react-icons/ri';

import { URLArgs } from 'accumulate.js';
import {
  KeyPage,
  LiteIdentity,
  LiteTokenAccount,
  TokenAccount,
} from 'accumulate.js/lib/core';

import { ACME } from '../../utils/url';
import { TokenAmount } from '../common/Amount';
import { Shared } from '../common/Network';
import { WithIcon } from '../common/WithIcon';
import { useAsyncEffect } from '../common/useAsync';
import { TxnFormProps } from './BaseTxnForm';
import { InputCreditRecipient, InputTokenAccount } from './InputAccount';
import { Sign } from './Sign';

const { Text, Paragraph } = Typography;

interface Fields {
  from: TokenAccount | LiteTokenAccount;
  to: LiteIdentity | KeyPage;
  credits: number;
  oracle: number;
  tokens: number;
}

export function AddCredits({
  open,
  onCancel,
  onFinish,
  signer,
  ...props
}: {
  from?: URLArgs;
  to?: URLArgs;
} & TxnFormProps) {
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

  // Validate the sender
  const from = Form.useWatch('from', form);
  useEffect(() => {
    if (!from?.tokenUrl) {
      return;
    }
    if (!from.tokenUrl.equals(ACME)) {
      form.setFields([
        {
          name: 'from',
          errors: [`Cannot use ${from.tokenUrl} to purchase credits`],
        },
      ]);
    }
  }, [from]);

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
  const submit = async ({ from, to, tokens, oracle }: Fields) => {
    setPending(true);
    try {
      await Sign.submit(
        setToSign,
        {
          header: {
            principal: from.url,
          },
          body: {
            type: 'addCredits',
            recipient: to.url,
            amount: tokens,
            oracle,
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
        <Form.Item label="Sender">
          <InputTokenAccount
            name="from"
            noStyle
            readOnly={!!props.from}
            initialValue={props.from}
            rules={[{ required: true }]}
          />
          {from?.tokenUrl?.equals(ACME) && (
            <Paragraph style={{ marginTop: 5, marginBottom: 0 }}>
              <Text type="secondary">
                Available balance:{' '}
                <TokenAmount amount={from?.balance} issuer={'ACME'} />
              </Text>
            </Paragraph>
          )}
        </Form.Item>
        <InputCreditRecipient
          label="Recipient"
          name="recipient"
          readOnly={!!props.to}
          initialValue={props.to}
          allowMissingLite
          rules={[{ required: true }]}
        />
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
