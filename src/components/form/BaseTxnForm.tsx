import { Button, Form, FormInstance, Modal } from 'antd';
import React, { useState } from 'react';

import { TransactionArgs } from 'accumulate.js/lib/core';

import { Sign } from './Sign';

export interface TxnFormProps {
  open: boolean;
  signer?: Sign.Signer;
  onCancel: () => any;
  onFinish: (ok: boolean) => any;
}

export function BaseTxnForm<Fields>({
  open,
  signer,
  onCancel,
  onFinish,

  title,
  form,
  children,
  submit: makeTxn,
}: {
  title: string;
  form: FormInstance;
  children: React.ReactNode;
  submit: (_: Fields) => TransactionArgs;
} & TxnFormProps) {
  const [signRequest, setSignRequest] = useState<Sign.Request>();
  const [isSigning, setIsSigning] = useState(false);

  const submit = async (fields: Fields) => {
    setIsSigning(true);
    try {
      const ok = await Sign.submit(setSignRequest, makeTxn(fields), signer);
      onFinish(ok);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      footer={false}
      forceRender
      closable={true} // Always allow manually closing
      maskClosable={!isSigning}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        disabled={isSigning}
        onFinish={submit}
      >
        {children}

        <Form.Item>
          <Button
            htmlType="submit"
            type="primary"
            shape="round"
            size="large"
            loading={isSigning}
            children="Submit"
          />
        </Form.Item>
      </Form>

      <Sign request={signRequest} />
    </Modal>
  );
}
