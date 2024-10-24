import { Form, FormInstance, Input } from 'antd';
import React, { useContext } from 'react';

import { URLArgs } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import { ADI } from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { Network } from '../common/Network';
import { isErrorRecord } from '../common/query';
import { InputIdentity } from './InputAccount';
import { formUtils, useFormWatchEffect } from './utils';

interface Fields {
  identity: ADI;
  name: string;
}

export function InputNewAccount<F extends Fields>(props: {
  identity?: URLArgs;
  form: FormInstance<F>;
}) {
  const form = props.form as FormInstance<Fields>;
  const { api } = useContext(Network);
  const { setError, clearError, setValidating } = formUtils(form);

  useFormWatchEffect(
    form,
    ['identity', 'name'],
    async ({ identity, name }, mounted) => {
      if (!identity || !name) return;
      const url = identity.url.join(name);

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
  );

  return (
    <>
      <Form.Item label="ADI">
        <InputIdentity
          name="identity"
          noStyle
          readOnly={!!props.identity}
          initialValue={props.identity}
          rules={[{ required: true }]}
        />
      </Form.Item>

      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
    </>
  );
}
