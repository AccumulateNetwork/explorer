import { Button, Form, FormInstance, Input, Modal, Spin } from 'antd';
import React, { useState } from 'react';

import { useWeb3 } from '../web3/useWeb3';
import { Sign } from './Sign';

interface Fields {
  value: string;
}

export function AddNote({
  open,
  onFinish,
  onCancel,
}: {
  open: boolean;
  onFinish(): any;
  onCancel(): any;
}) {
  const account = useWeb3();
  const [form] = Form.useForm<Fields>();
  const [toSign, setToSign] = useState<Sign.Request>();
  const [pending, setPending] = useState(false);

  const submit = async ({ value }: Fields) => {
    setPending(true);
    try {
      await account.store.add((txn) => Sign.submit(setToSign, txn), {
        type: 'note',
        value,
      });
      onFinish();
    } finally {
      onCancel();
      setPending(false);
    }
  };

  return (
    <Modal
      title="Add Note"
      open={open}
      onCancel={onCancel}
      footer={false}
      forceRender
      closable={!pending}
      maskClosable={!pending}
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        requiredMark={false}
        disabled={pending}
        onFinish={submit}
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
        </Form.Item>
      </Form>

      <Sign request={toSign} />
    </Modal>
  );
}
