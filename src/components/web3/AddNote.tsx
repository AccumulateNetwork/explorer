import { Button, Form, FormInstance, Input, Modal, Spin } from 'antd';
import React, { useState } from 'react';

export declare namespace AddNote {
  interface Fields {
    value: string;
  }
}

export function AddNote({
  open,
  onSubmit,
  onCancel,
  children,
}: {
  open: boolean;
  onSubmit: (_: AddNote.Fields) => any;
  onCancel: () => any;
  children?: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Modal
      title="Add Note"
      open={open}
      onCancel={onCancel}
      footer={false}
      forceRender
    >
      <Form
        layout="vertical"
        className="modal-form"
        preserve={false}
        disabled={pending}
        onFinish={async (v) => {
          setPending(true);
          try {
            await onSubmit(v);
          } finally {
            setPending(false);
          }
        }}
      >
        <Form.Item
          label="Note"
          className="text-row"
          name="value"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item>
          <Button
            htmlType="submit"
            type="primary"
            shape="round"
            size="large"
            loading={pending}
            children="Submit"
          />
          {children}
        </Form.Item>
      </Form>
    </Modal>
  );
}
