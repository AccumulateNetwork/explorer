import { Form, Input, InputNumber, Typography } from 'antd';
import React, { useContext, useEffect } from 'react';

import { URLArgs } from 'accumulate.js';
import {
  KeyPage,
  LiteIdentity,
  LiteTokenAccount,
  TokenAccount,
  TransactionArgs,
} from 'accumulate.js/lib/core';

import { omit } from '../../utils/typemagic';
import { ACME } from '../../utils/url';
import { TokenAmount } from '../common/Amount';
import { Network } from '../common/Network';
import { useAsyncEffect } from '../common/useAsync';
import { BaseTxnForm, TxnForm } from './BaseTxnForm';
import { InputCreditRecipient, InputTokenAccount } from './InputAccount';
import { formUtils } from './utils';

const { Text, Paragraph } = Typography;

interface Fields {
  from: TokenAccount | LiteTokenAccount;
  to: LiteIdentity | KeyPage;
  credits: number;
  oracle: number;
  tokens: number;
}

export function AddCredits(
  props: {
    from?: URLArgs;
    to?: URLArgs;
  } & TxnForm.Props,
) {
  const [form] = Form.useForm<Fields>();
  const { setError, clearError } = formUtils(form);

  // Get the oracle
  const { api } = useContext(Network);
  useAsyncEffect(async (mounted) => {
    clearError('oracle');
    try {
      const r = await api.networkStatus({});
      if (!mounted()) {
        return;
      }
      form.setFieldsValue({ oracle: r?.oracle?.price });
    } catch (error) {
      setError('oracle', 'Failed to fetch oracle');
    }
  }, []);

  // Validate the sender
  const from = Form.useWatch('from', form);
  useEffect(() => {
    if (!from?.tokenUrl) {
      return;
    }
    if (!from.tokenUrl.equals(ACME)) {
      setError('from', `Cannot use ${from.tokenUrl} to purchase credits`);
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
  const submit = ({ from, to, tokens, oracle }: Fields): TransactionArgs => ({
    header: {
      principal: from?.url,
    },
    body: {
      type: 'addCredits',
      recipient: to?.url,
      amount: tokens,
      oracle,
    },
  });

  return (
    <BaseTxnForm
      {...omit(props, 'to', 'from')}
      title="Purchase credits"
      form={form}
      submit={submit}
      onValuesChange={(v) => changed(v)}
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
        name="to"
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
    </BaseTxnForm>
  );
}
