import { Form, InputNumber, Typography } from 'antd';
import { useEffect } from 'react';
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
import { useQuery } from '../common/useQuery';
import { BaseTxnForm, TxnFormProps } from './BaseTxnForm';
import { InputTokenAccount } from './InputAccount';
import { useFormUtils } from './utils';

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
  } & TxnFormProps,
) {
  const [form] = Form.useForm<Fields>();
  const { setError, clearError } = useFormUtils(form);

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

  // Load the issuer
  const issued = useQuery(from?.tokenUrl);
  const issuer =
    issued.data && isRecordOf(issued.data, TokenIssuer)
      ? issued.data.account
      : undefined;

  // The watched values are the form store's own objects, so these keep their
  // identity until the user picks a different account.
  const fromTokenUrl = from?.tokenUrl;
  const toTokenUrl = to?.tokenUrl;
  const toUrl = to?.url;
  useEffect(() => {
    // Wait for the sender's issuer: it loads after `from` changes, and until it
    // does `issuer` is missing or still the previous sender's.
    if (
      issuer &&
      fromTokenUrl &&
      toTokenUrl &&
      !fromTokenUrl.equals(toTokenUrl)
    ) {
      setError('to', `Cannot send ${issuer.symbol || issuer.url} to ${toUrl}`);
    }
    // setError comes from useFormUtils and is rebuilt each render; listing it
    // would re-run this (and re-set the field error) on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setError is unstable, see above
  }, [fromTokenUrl, toTokenUrl, toUrl, issuer]);

  // Writing the form's error state is a side effect, so it stays an effect.
  useEffect(() => {
    const r = issued.data;
    if (!r) {
      return;
    }
    if (r.recordType == RecordType.Error) {
      setError(
        'from',
        r.value.code === Status.NotFound
          ? 'Unable to load the token type'
          : r.value,
      );
      return;
    }
    if (!isRecordOf(r, TokenIssuer)) {
      setError('from', 'Unable to load the token type');
      return;
    }
    clearError('from');
    // setError/clearError come from useFormUtils and are rebuilt each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issued.data]);

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
