import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Divider, Form, Input, Space, Tabs } from 'antd';
import React, { useContext, useState } from 'react';
import { RiQuestionLine } from 'react-icons/ri';

import { URL, URLArgs } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import { ADI, KeyBook, TransactionArgs } from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import tooltip from '../../utils/lang';
import { omit } from '../../utils/typemagic';
import { Network } from '../common/Network';
import { unwrapError } from '../common/ShowError';
import { WithIcon } from '../common/WithIcon';
import { isErrorRecord } from '../common/query';
import { useWeb3 } from '../web3/Context';
import { BaseTxnForm, TxnFormProps } from './BaseTxnForm';
import { InputAuthority, InputIdentity } from './InputAccount';
import { formUtils, useFormWatchEffect, useFormWatchMemo } from './utils';

interface Fields {
  parent: ADI;
  name: string;
  authorities: KeyBook[];
}

export function CreateSubADI(props: { parent: URLArgs } & TxnFormProps) {
  const [form] = Form.useForm<Fields>();
  const web3 = useWeb3();
  const { api } = useContext(Network);
  const { setError, clearError, setValidating } = formUtils(form);
  const [owner, setOwner] = useState<'external' | 'parent' | 'self'>('parent');

  const submit = ({ parent, name, authorities }: Fields): TransactionArgs => {
    const url = `${parent.url}/${name}`;
    return {
      header: {
        principal: parent.url,
      },
      body: {
        type: 'createIdentity',
        url,
        keyBookUrl: owner === 'self' ? `${url}/book` : null,
        keyHash: owner === 'self' ? web3.publicKey.publicKeyHash : null,
        authorities:
          owner === 'external' ? authorities?.map((x) => x.url) : null,
      },
    };
  };

  // Validate the ADI URL
  const parent = Form.useWatch('parent', form);
  useFormWatchEffect(
    form,
    'name',
    async (name, mounted) => {
      if (!name || !parent) {
        return;
      }

      let url: URL;
      try {
        url = URL.parse(`${parent.url}/${name}`);
      } catch (error) {
        setError('name', `Invalid URL: ${unwrapError(error)}`);
        return;
      }

      if (name.includes('/')) {
        setError('name', `URL must not contain /`);
        return;
      }

      clearError('name');
      setValidating('name', true);
      const r = await api.query(url).catch(isErrorRecord);
      if (!mounted()) {
        return;
      }

      setValidating('name', false);
      if (r.recordType !== RecordType.Error) {
        setError('name', `${url} already exists`);
      } else if (r.value.code !== Status.NotFound) {
        setError('name', r.value);
      }
    },
    [`${parent?.url}`],
  );

  return (
    <BaseTxnForm
      {...omit(props, 'parent')}
      title="Create sub-ADI"
      form={form}
      submit={submit}
    >
      <Form.Item
        label={
          <WithIcon after icon={RiQuestionLine} tooltip={tooltip.form.adiUrl}>
            URL
          </WithIcon>
        }
      >
        <Space.Compact block>
          <InputIdentity
            name="parent"
            noStyle
            readOnly={!!props.parent}
            initialValue={props.parent}
            rules={[{ required: true }]}
            style={{ flexShrink: 2 }}
          />

          <Form.Item noStyle name="name" rules={[{ required: true }]}>
            <Input addonBefore="/" />
          </Form.Item>
        </Space.Compact>
      </Form.Item>

      <Divider />

      <Tabs
        style={{ marginBottom: 20 }}
        defaultActiveKey="parent"
        tabBarExtraContent={{
          left: (
            <span
              style={{
                marginRight: 20,
                color: 'hsl(0, 0%, 70%)',
                verticalAlign: -1,
              }}
            >
              Owned
            </span>
          ),
        }}
        onChange={(x) => setOwner(x as any)}
        items={[
          {
            key: 'parent',
            label: (
              <WithIcon
                after
                icon={RiQuestionLine}
                tooltip={tooltip.form.parentOwned}
                children="By ADI"
              />
            ),
            children: (
              <Form.Item label="Owner">
                <Input readOnly value={parent && `${parent?.url}`} />
              </Form.Item>
            ),
          },
          {
            key: 'self',
            label: (
              <WithIcon
                after
                icon={RiQuestionLine}
                tooltip={tooltip.form.selfOwned}
                children="By Key"
              />
            ),
            children: (
              <>
                <Form.Item
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
                    value={useFormWatchMemo(
                      form,
                      'name',
                      (name) => parent && name && `${parent?.url}/${name}/book`,
                      [`${parent?.url}`],
                    )}
                  />
                </Form.Item>

                <Form.Item
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
              </>
            ),
          },
          {
            key: 'external',
            label: (
              <WithIcon
                after
                icon={RiQuestionLine}
                tooltip={tooltip.form.externallyOwned}
                children="Externally"
              />
            ),
            children: (
              <Form.Item label="Authorities">
                <Form.List
                  name="authorities"
                  children={(fields, { add, remove }, { errors }) => (
                    <Space
                      direction="vertical"
                      size="middle"
                      style={{ width: '100%' }}
                    >
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
            ),
          },
        ]}
      />
    </BaseTxnForm>
  );
}
