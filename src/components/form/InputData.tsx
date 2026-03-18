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
  const get = (form: InternalFormInstance) => {
    const fullName = [...(form.prefixName || []), name];
    const format = form.getFieldValue([...fullName, 'format']);
    const value = form.getFieldValue([...fullName, 'value']);
    const fns = formUtils(form, [name, 'value']);
    return { format, value, ...fns };
  };

  const validate = async (form: InternalFormInstance) => {
    const { format, value } = get(form);

    if (!value) return;

    switch (format) {
      case 'hex':
        if (value.match(/[^0-9a-f]/i)) {
          throw new Error('Invalid hex value');
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
            async validator() {
              const form2 = form as InternalFormInstance;
              const { setError, clearError } = get(form2);
              try {
                clearError();
                await validate(form2);
              } catch (error) {
                setError(error);
              }
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
            validator: () => validate(form as InternalFormInstance),
          }),
        ]}
      >
        <Input />
      </Form.Item>
      {after}
    </Space.Compact>
  );
}
