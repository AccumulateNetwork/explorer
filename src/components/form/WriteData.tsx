import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Space, Switch, Typography } from 'antd';
import React from 'react';

import { URLArgs } from 'accumulate.js';
import {
  DataAccount,
  LiteDataAccount,
  TransactionArgs,
} from 'accumulate.js/lib/core';

import { omit } from '../../utils/typemagic';
import { BaseTxnForm, TxnForm } from './BaseTxnForm';
import { InputDataAccount } from './InputAccount';
import { InputData } from './InputData';

const { Text, Paragraph } = Typography;

interface Fields {
  to: DataAccount | LiteDataAccount;
  entries: { format: 'hex' | 'utf-8'; value: string }[];
  writeToState: boolean;
  scratch: boolean;
}

export function WriteData(
  props: {
    to?: URLArgs;
    data?: Uint8Array[];
  } & TxnForm.Props,
) {
  const [form] = Form.useForm<Fields>();
  const to = Form.useWatch('to', form);
  const writeToState = Form.useWatch('writeToState', form);

  const submit = ({
    to,
    entries,
    writeToState,
    scratch,
  }: Fields): TransactionArgs => {
    return {
      header: {
        principal: to?.url,
      },
      body: {
        type: 'writeData',
        writeToState,
        scratch,
        entry: {
          type: 'doubleHash',
          data: entries?.map((x) => x && Buffer.from(x.value, x.format)),
        },
      },
    };
  };

  return (
    <BaseTxnForm
      {...omit(props, 'to')}
      title="Write data"
      form={form}
      submit={submit}
    >
      <InputDataAccount
        label="Account"
        name="to"
        allowMissingLite
        readOnly={!!props.to}
        initialValue={props.to}
        rules={[{ required: true }]}
      />

      <Space.Compact block>
        <Form.Item
          label="Write to state"
          name="writeToState"
          style={{ flex: 1 }}
          tooltip={
            to instanceof LiteDataAccount
              ? 'Lite data accounts do not support write-to-state'
              : undefined
          }
        >
          <Switch disabled={to instanceof LiteDataAccount} />
        </Form.Item>

        <Form.Item
          label="Scratch"
          name="scratch"
          style={{ flex: 1 }}
          tooltip={
            to instanceof LiteDataAccount
              ? 'Lite data accounts do not support scratch data entries'
              : writeToState === true
                ? 'Write-to-state and scratch data entries are mutually exclusive'
                : undefined
          }
        >
          <Switch disabled={to instanceof LiteDataAccount || writeToState} />
        </Form.Item>
      </Space.Compact>

      <Form.Item label="Entries">
        <Form.List
          name="entries"
          children={(fields, { add, remove }) => {
            // const fc = useContext(FieldContext);
            // console.log(fc);
            return (
              <Space
                direction="vertical"
                size="middle"
                style={{ width: '100%' }}
              >
                {fields.map((field) => (
                  <InputData
                    key={field.key}
                    name={field.name}
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
            );
          }}
        />
      </Form.Item>
    </BaseTxnForm>
  );
}
