import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Divider, Form, Input, Space, Switch, Typography } from 'antd';
import React, { useContext, useMemo, useState } from 'react';
import { RiQuestionLine } from 'react-icons/ri';

import { URL } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import { AccountType, KeyBook, TransactionArgs } from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import tooltip from '../../utils/lang';
import { omit } from '../../utils/typemagic';
import { Network } from '../common/Network';
import { unwrapError } from '../common/ShowError';
import { WithIcon } from '../common/WithIcon';
import { isErrorRecord } from '../common/query';
import { useIsMounted } from '../common/useIsMounted';
import { useConnect } from '../web3';
import { BaseTxnForm, TxnFormProps } from './BaseTxnForm';
import { InputAuthority } from './InputAccount';
import { Sign } from './Sign';
import { formUtils, useFormWatchEffect, useFormWatchMemo } from './utils';

interface Fields {
  url: string;
  authorities: KeyBook[];
}

export function CreateIdentity(props: TxnFormProps) {
  const [form] = Form.useForm<Fields>();
  const web3 = useConnect();
  const { api } = useContext(Network);
  const { setError, clearError, setValidating } = formUtils(form);
  const [externallyOwned, setExternallyOwned] = useState(false);

  const submit = ({ url, authorities }: Fields): TransactionArgs => {
    return {
      header: {
        principal: url,
      },
      body: {
        type: 'createIdentity',
        url,
        keyBookUrl: externallyOwned ? null : `${url}/book`,
        keyHash: externallyOwned ? null : web3.publicKey.publicKeyHash,
        authorities: externallyOwned ? authorities?.map((x) => x.url) : null,
      },
    };
  };

  // Validate the ADI URL
  useFormWatchEffect(form, 'url', async (s, mounted) => {
    if (!s) {
      return;
    }

    let url: URL;
    try {
      url = URL.parse(s);
    } catch (error) {
      setError('url', `Invalid URL: ${unwrapError(error)}`);
      return;
    }

    if (url.path != '') {
      setError('url', `URL must not contain /`);
      return;
    } else if (!url.authority.endsWith('.acme')) {
      setError('url', `URL must end with .acme`);
      return;
    }

    clearError('url');
    setValidating('url', true);
    const r = await api.query(url).catch(isErrorRecord);
    if (!mounted()) {
      return;
    }

    setValidating('url', false);
    if (r.recordType !== RecordType.Error) {
      setError('url', `${url} already exists`);
    } else if (r.value.code !== Status.NotFound) {
      setError('url', r.value);
    }
  });

  const isMounted = useIsMounted();
  const [toSign, setToSign] = useState<Sign.Request>();
  const onFinish = async (ok: boolean) => {
    if (!isMounted.current) {
      return;
    }
    if (ok) {
      const ok = await web3.dataStore.add(
        (txn) => Sign.submit(setToSign, txn),
        {
          type: 'link',
          url: form.getFieldValue('url'),
          accountType: 'identity',
        },
      );
      if (!isMounted.current) {
        return;
      }
      if (ok) {
        web3.reload({ dataStore: true });
      }
    }
    props.onFinish(ok);
  };

  return (
    <BaseTxnForm
      {...omit(props, 'onFinish')}
      title="Create ADI"
      form={form}
      submit={submit}
      onFinish={onFinish}
    >
      <Form.Item
        name="url"
        rules={[{ required: true }]}
        label={
          <WithIcon after icon={RiQuestionLine} tooltip={tooltip.form.adiUrl}>
            URL
          </WithIcon>
        }
      >
        <Input />
      </Form.Item>

      <Divider />

      <Form.Item
        label={
          <WithIcon
            after
            icon={RiQuestionLine}
            tooltip={tooltip.form.externallyOwned}
          >
            Externally owned
          </WithIcon>
        }
      >
        <Switch checked={externallyOwned} onChange={setExternallyOwned} />
      </Form.Item>

      <Form.Item
        hidden={externallyOwned}
        label={
          <WithIcon
            after
            icon={RiQuestionLine}
            tooltip={tooltip.form.adiKeyBook}
            children="Key book"
          />
        }
      >
        <Input
          readOnly
          value={useFormWatchMemo(form, 'url', (url) => url && `${url}/book`)}
        />
      </Form.Item>

      <Form.Item
        hidden={externallyOwned}
        label={
          <WithIcon
            after
            icon={RiQuestionLine}
            tooltip={tooltip.form.initialKey}
            children="Initial key"
          />
        }
      >
        <Input readOnly value={web3?.publicKey?.ethereum} />
      </Form.Item>

      <Form.Item label="Authorities" hidden={!externallyOwned}>
        <Form.List
          name="authorities"
          children={(fields, { add, remove }, { errors }) => (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {fields.map((field) => (
                <InputAuthority
                  key={field.key}
                  name={field.name}
                  noStyle
                  rules={[{ required: true }]}
                  after={
                    <Button
                      icon={<CloseOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  }
                />
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
              />
            </Space>
          )}
        />
      </Form.Item>

      <Sign title={`Linking ${form.getFieldValue('url')}`} request={toSign} />
    </BaseTxnForm>
  );
}
