import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, FormInstance, Space } from 'antd';
import React from 'react';

import { KeyBook } from 'accumulate.js/lib/core';

import { InputAuthority } from './InputAccount';

interface Fields {
  authorities: KeyBook[];
}

export function InputAuthorities<F extends Fields>({
  hidden,
}: {
  form: FormInstance<F>;
  hidden?: boolean;
}) {
  return (
    <Form.Item label="Authorities" hidden={hidden}>
      <Form.List
        name="authorities"
        children={(fields, { add, remove }) => (
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
  );
}
