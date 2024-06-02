import { Button, Form, FormInstance, Input, Modal, Spin } from 'antd';
import React, { useState } from 'react';

export function AddNote({
  open,
  onSubmit,
  onCancel,
  children,
  canSubmit,
  form,
}: {
  open: boolean;
  onSubmit: () => any;
  onCancel: () => any;
  children?: React.ReactNode;
  canSubmit: boolean;
  form: FormInstance;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Modal title="Add Note" open={open} onCancel={onCancel} footer={false}>
      <Form form={form} layout="vertical" className="modal-form">
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
            disabled={!canSubmit || pending}
          >
            {pending ? <Spin /> : 'Submit'}
          </Button>
          {children}
        </Form.Item>
      </Form>
    </Modal>
  );
}
