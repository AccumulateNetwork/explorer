import { Button, Form, Input, Modal } from 'antd';
import React, { useState } from 'react';

import { useIsMounted } from '../common/useIsMounted';
import { useConnect } from '../web3';
import { TxnFormProps } from './BaseTxnForm';
import { Sign } from './Sign';

interface Fields {
  value: string;
}

export function AddNote({ open, signer, onFinish, onCancel }: TxnFormProps) {
  const web3 = useConnect();
  const [form] = Form.useForm<Fields>();
  const [toSign, setToSign] = useState<Sign.Request>();
  const [pending, setPending] = useState(false);

  const isMounted = useIsMounted();
  const submit = async ({ value }: Fields) => {
    setPending(true);
    try {
      const ok = await web3.dataStore.add(
        (txn) => Sign.submit(setToSign, txn, signer),
        {
          type: 'note',
          value,
        },
      );
      if (!isMounted.current) {
        return;
      }
      onFinish(ok);
    } finally {
      if (!isMounted.current) {
        return;
      }
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
