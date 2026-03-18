import { Form, InputNumber, Typography } from 'antd';
import { useEffect, useState } from 'react';
import React from 'react';

import { URLArgs } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import {
  LiteTokenAccount,
  TokenAccount,
  TokenIssuer,
  TransactionArgs,
} from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { omit } from '../../utils/typemagic';
import { isRecordOf } from '../../utils/types';
import { TokenAmount } from '../common/Amount';
import { queryEffect } from '../common/query';
import { BaseTxnForm, TxnForm } from './BaseTxnForm';
import { InputTokenAccount } from './InputAccount';
import { formUtils } from './utils';

const { Text, Paragraph } = Typography;

interface Fields {
  from: TokenAccount | LiteTokenAccount;
  to: TokenAccount | LiteTokenAccount;
  amount: number;
}

export function SendTokens(
  props: {
    from?: URLArgs;
    to?: URLArgs;
  } & TxnForm.Props,
) {
  const [form] = Form.useForm<Fields>();
  const { setError, clearError } = formUtils(form);

  const submit = ({ from, to, amount }: Fields): TransactionArgs => {
    if (amount && issuer) {
      amount *= 10 ** issuer.precision;
    }
    return {
      header: {
        principal: from?.url,
      },
      body: {
        type: 'sendTokens',
        to: [{ url: to?.url, amount }],
      },
    };
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

  return (
    <BaseTxnForm
      {...omit(props, 'to', 'from')}
      title="Send tokens"
      form={form}
      submit={submit}
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
          style={{ width: '100%' }}
          min={0}
          max={issuer && from && Number(from.balance) / 10 ** issuer.precision}
          addonAfter={issuer?.symbol || issuer?.url?.toString()}
        />
      </Form.Item>
    </BaseTxnForm>
  );
}
