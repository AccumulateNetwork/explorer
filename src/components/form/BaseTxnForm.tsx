import { DownOutlined } from '@ant-design/icons';
import {
  Button,
  Divider,
  Dropdown,
  Form,
  FormInstance,
  Modal,
  Space,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';

import { URL } from 'accumulate.js';
import {
  KeyPage,
  LiteIdentity,
  Transaction,
  TransactionArgs,
} from 'accumulate.js/lib/core';

import { isLite } from '../../utils/url';
import { CreditAmount } from '../common/Amount';
import { useIsMounted } from '../common/useIsMounted';
import { useWeb3 } from '../web3/useWeb3';
import { Sign } from './Sign';
import { calculateTransactionFee } from './fees';

const { Text } = Typography;

export interface TxnFormProps {
  open: boolean;
  signer?: Signer;
  onCancel: () => any;
  onFinish: (ok: boolean) => any;
}

type Signer = Sign.Signer & { account: KeyPage | LiteIdentity };

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
  const [signers, setSigners] = useState<Signer[]>([]);
  const [selectedSigner, setSelectedSigner] = useState<Signer>(theSigner);
  const [fee, setFee] = useState(0);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    setSigners([]);
    if (theSigner || !account?.linked) {
      return;
    }

    const signers: Signer[] = [];
    if (account.liteIdentity) {
      signers.push({
        signer: account.liteIdentity.url,
        signerVersion: 1,
        account: account.liteIdentity,
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
            account: page,
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

  useEffect(() => {
    if (!selectedSigner?.account) {
      setBalance(null);
    } else {
      setBalance(selectedSigner.account.creditBalance);
    }
  }, [selectedSigner]);

  const updateFee = (fields: Fields) => {
    try {
      setFee(calculateTransactionFee(new Transaction(makeTxn(fields))));
    } catch (error) {
      console.info(`Error while calculating fee`, error);
      setFee(0);
    }
  };

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

  const submitBtn = (
    <Button type="primary" loading={isSigning} onClick={() => form.submit()}>
      <SignWith />
    </Button>
  );

  const footer = (
    <Space>
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
            submitBtn
          ) : (
            <Button type="ghost" disabled>
              Select signer
              <DownOutlined />
            </Button>
          )}
        </Dropdown>
      ) : (
        submitBtn
      )}
    </Space>
  );

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      footer={footer}
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
        onValuesChange={(_, v) => {
          updateFee(v);
          onValuesChange?.(v);
        }}
      >
        {children}

        {!!fee && (
          <Space.Compact block>
            <Form.Item label="Fee" style={{ flex: 1, marginBottom: 0 }}>
              <Text type="secondary">
                <CreditAmount type="secondary" amount={fee} />
              </Text>
            </Form.Item>

            <Form.Item label="Balance" style={{ flex: 1, marginBottom: 0 }}>
              {balance == null ? (
                'Unknown'
              ) : (
                <CreditAmount
                  type="secondary"
                  amount={balance}
                  style={balance < fee ? { color: 'red' } : {}}
                />
              )}
            </Form.Item>
          </Space.Compact>
        )}
      </Form>

      <Sign request={signRequest} />
    </Modal>
  );
}
