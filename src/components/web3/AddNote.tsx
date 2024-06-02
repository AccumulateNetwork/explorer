import { Button, Form, FormInstance, Input, Modal, Spin } from 'antd';
import React, { useState } from 'react';

export function AddNote({
  open,
  onSubmit,
  onCancel,
  children,
  form,
}: {
  open: boolean;
  onSubmit: () => any;
  onCancel: () => any;
  children?: React.ReactNode;
  form: FormInstance;
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
        form={form}
        layout="vertical"
        className="modal-form"
        preserve={false}
      >
        <Form.Item label="Note" className="text-row" name="value">
          <Input />
        </Form.Item>
        <Form.Item>
          <Button
            onClick={async () => {
              setPending(true);
              try {
                await onSubmit();
              } finally {
                setPending(false);
              }
            }}
            type="primary"
            shape="round"
            size="large"
            disabled={!form.getFieldValue('value') || pending}
          >
            {pending ? <Spin /> : 'Submit'}
          </Button>
          {children}
        </Form.Item>
      </Form>
    </Modal>
  );
}
