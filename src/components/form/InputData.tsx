import { Form, FormItemProps, Input, Select, Space } from 'antd';
import type { InternalFormInstance } from 'rc-field-form/es/interface';
import React from 'react';

import { formUtils } from './utils';

export function InputData({
  name,
  after,
  ...props
}: Omit<FormItemProps, 'children' | 'onChange' | 'noStyle' | 'initialValue'> & {
  after?: React.ReactNode;
}) {
  const validate = (form: InternalFormInstance) => {
    const fullName = [...(form.prefixName || []), name];
    const format = form.getFieldValue([...fullName, 'format']);
    const value = form.getFieldValue([...fullName, 'value']);
    const { setError, clearError } = formUtils(form, [name, 'value']);

    clearError();
    if (!value) return;

    switch (format) {
      case 'hex':
        if (value.match(/[^0-9a-f]/i)) {
          setError('Invalid hex value');
        }
        break;
    }
  };
  return (
    <Space.Compact block>
      <Form.Item
        noStyle
        name={[name, 'format']}
        initialValue="utf-8"
        rules={[
          (form) => ({
            validator() {
              validate(form as InternalFormInstance);
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Select
          style={{ width: 'initial' }}
          options={[
            { value: 'utf-8', label: 'Text' },
            { value: 'hex', label: 'Hex' },
          ]}
        />
      </Form.Item>
      <Form.Item
        noStyle
        {...props}
        name={[name, 'value']}
        rules={[
          (form) => ({
            validator() {
              validate(form as InternalFormInstance);
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input />
      </Form.Item>
      {after}
    </Space.Compact>
  );
}
