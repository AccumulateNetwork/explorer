import { Divider, Form, Input, Switch, Tooltip } from 'antd';
import React, { useState } from 'react';
import { RiQuestionLine } from 'react-icons/ri';

import { URLArgs } from 'accumulate.js';
import { ADI, KeyBook, TransactionArgs } from 'accumulate.js/lib/core';

import tooltip from '../../utils/lang';
import { omit } from '../../utils/typemagic';
import { WithIcon } from '../common/WithIcon';
import { BaseTxnForm, TxnForm } from './BaseTxnForm';
import { InheritedAuthorities } from './InheritedAuthorities';
import { InputAuthorities } from './InputAuthorities';
import { InputNewAccount } from './InputNewAccount';

interface Fields {
  identity: ADI;
  name: string;
  authorities: KeyBook[];
}

export function CreateTokenAccount(
  props: {
    identity?: URLArgs;
  } & TxnForm.Props,
) {
  const [form] = Form.useForm<Fields>();
  const [externallyOwned, setExternallyOwned] = useState(false);

  const submit = ({ identity, name, authorities }: Fields): TransactionArgs => {
    return {
      header: {
        principal: identity?.url,
      },
      body: {
        type: 'createTokenAccount',
        url: identity && name && identity.url.join(name),
        tokenUrl: 'ACME', // TODO: Support other token types
        authorities: externallyOwned
          ? authorities?.filter((x) => x).map((x) => x.url)
          : null,
      },
    };
  };

  return (
    <BaseTxnForm
      {...omit(props, 'identity')}
      title="Create Token Account"
      form={form}
      submit={submit}
    >
      <InputNewAccount identity={props.identity} form={form} />

      <Form.Item label="Token">
        <Tooltip title="Creating non-ACME token accounts is not currently supported">
          <Input readOnly value="ACME" />
        </Tooltip>
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

      <InheritedAuthorities form={form} hidden={!externallyOwned} />

      <InputAuthorities form={form} hidden={externallyOwned} />
    </BaseTxnForm>
  );
}
