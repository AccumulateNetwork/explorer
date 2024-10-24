import { Form, FormInstance, Input } from 'antd';
import React from 'react';

import { ADI } from 'accumulate.js/lib/core';

interface Fields {
  identity: ADI;
}

export function InheritedAuthorities<F extends Fields>(props: {
  form: FormInstance<F>;
  hidden?: boolean;
}) {
  const form = props.form as FormInstance<Fields>;
  const identity = Form.useWatch('identity', form);
  return (
    <Form.Item hidden={props.hidden} label={'Authorities (inherited)'}>
      {identity?.authorities?.map((x, i) => (
        <Input
          readOnly
          key={`${x.url}`}
          value={`${x.url} ${x.disabled ? '(disabled)' : ''}`}
          style={i > 0 ? { marginTop: 2 } : {}}
        />
      ))}
    </Form.Item>
  );
}
