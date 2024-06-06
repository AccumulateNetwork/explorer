import { DownOutlined } from '@ant-design/icons';
import { Button, Dropdown, Form, FormInstance, Modal } from 'antd';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { URL } from 'accumulate.js';
import { TransactionArgs } from 'accumulate.js/lib/core';

import { isLite } from '../../utils/url';
import { Shared } from '../common/Network';
import { useAsyncEffect } from '../common/useAsync';
import { useIsMounted } from '../common/useIsMounted';
import { useWeb3 } from '../web3/useWeb3';
import { Sign } from './Sign';

export interface TxnFormProps {
  open: boolean;
  signer?: Sign.Signer;
  onCancel: () => any;
  onFinish: (ok: boolean) => any;
}

export function BaseTxnForm<Fields>({
  open,
  signer: theSigner,
  onCancel,
  onFinish,

  title,
  form,
  children,
  submit: makeTxn,
  onValuesChange,
}: {
  title: string;
  form: FormInstance;
  children: React.ReactNode;
  submit(_: Fields): TransactionArgs;
  onValuesChange?(_: Fields): void;
} & TxnFormProps) {
  const account = useWeb3();
  const [signRequest, setSignRequest] = useState<Sign.Request>();
  const [isSigning, setIsSigning] = useState(false);
  const [signers, setSigners] = useState<Sign.Signer[]>([]);
  const [selectedSigner, setSelectedSigner] = useState<Sign.Signer>(theSigner);

  useEffect(() => {
    setSigners([]);
    if (theSigner || !account?.linked) {
      return;
    }

    const signers: Sign.Signer[] = [];
    if (account.liteIdentity) {
      signers.push({
        signer: account.liteIdentity.url,
        signerVersion: 1,
      });
    }

    const ethKeyHash = account.publicKey.ethereum
      .replace(/^0x/, '')
      .toLowerCase();
    for (const book of account.linked.books) {
      for (const page of book.pages) {
        const ok = page.keys.some(
          (entry) =>
            Buffer.from(entry.publicKeyHash).toString('hex') === ethKeyHash,
        );
        if (ok) {
          signers.push({
            signer: page.url,
            signerVersion: page.version,
          });
        }
      }
    }

    if (signers.length == 1) {
      setSelectedSigner(signers[0]);
    } else {
      setSigners(signers);
    }
  }, [account]);

  const isMounted = useIsMounted();
  const submit = async (fields: Fields) => {
    setIsSigning(true);
    try {
      const ok = await Sign.submit(
        setSignRequest,
        makeTxn(fields),
        selectedSigner,
      );
      if (!isMounted.current) {
        return;
      }
      onFinish(ok);
    } finally {
      if (!isMounted.current) {
        return;
      }
      setIsSigning(false);
    }
  };

  const SignWith = (): React.ReactNode => {
    if (!selectedSigner) {
      return 'Sign with ???';
    }
    const u = URL.parse(selectedSigner.signer);
    if (isLite(u)) {
      return `Sign with ${u.authority.substring(0, 8)}...`;
    }
    return `Sign with ${u.toString().replace(/acc:\/\//, '')}`;
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
        onValuesChange={(_, v) => onValuesChange?.(v)}
      >
        {children}

        <Form.Item>
          {signers?.length ? (
            <Dropdown
              menu={{
                items: signers.map((x) => ({
                  label: `${x.signer}`,
                  key: `${x.signer}`,
                  onClick: () => setSelectedSigner(x),
                })),
              }}
            >
              {selectedSigner ? (
                <Button htmlType="submit" type="primary" loading={isSigning}>
                  <SignWith />
                </Button>
              ) : (
                <Button type="ghost" disabled>
                  Select signer
                  <DownOutlined />
                </Button>
              )}
            </Dropdown>
          ) : (
            <Button htmlType="submit" type="primary" loading={isSigning}>
              <SignWith />
            </Button>
          )}
        </Form.Item>
      </Form>

      <Sign request={signRequest} />
    </Modal>
  );
}
