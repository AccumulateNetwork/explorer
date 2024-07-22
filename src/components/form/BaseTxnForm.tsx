import { DownOutlined } from '@ant-design/icons';
import {
  Button,
  Dropdown,
  Form,
  FormInstance,
  Modal,
  Space,
  Typography,
} from 'antd';
import React, { useContext, useEffect, useState } from 'react';

import { SignerWithVersion, URL } from 'accumulate.js';
import { AccountRecord, RecordType } from 'accumulate.js/lib/api_v3';
import {
  Account,
  KeyPage,
  LiteIdentity,
  Transaction,
  TransactionArgs,
} from 'accumulate.js/lib/core';

import { isRecordOf } from '../../utils/types';
import { isLite } from '../../utils/url';
import { CreditAmount } from '../common/Amount';
import { Network } from '../common/Network';
import { queryEffect } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { useIsMounted } from '../common/useIsMounted';
import { useWeb3 } from '../web3/Context';
import { Sign } from './Sign';
import { calculateTransactionFee } from './fees';
import { SignerSpec, getSigners } from './utils';

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
  const web3 = useWeb3();
  const { api } = useContext(Network);
  const [signRequest, setSignRequest] = useState<Sign.Request>();
  const [isSigning, setIsSigning] = useState(false);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [selectedSigner, setSelectedSigner] = useState<Signer>(theSigner);
  const [principal, setPrincipal] = useState<URL>();
  const [principalAccount, setPrincipalAccount] = useState<Account>();
  const [principalSigners, setPrincipalSigners] = useState<Signer[]>();
  const [fee, setFee] = useState(0);
  const [balance, setBalance] = useState(null);

  queryEffect(principal).then((r) => {
    if (r.recordType === RecordType.Account) {
      setPrincipalAccount(r.account);
    }
  });

  useAsyncEffect(
    async (mounted) => {
      if (!principalAccount) {
        return;
      }
      const signers = await getSigners(api, web3, principalAccount);
      if (!mounted()) {
        return;
      }
      setPrincipalSigners(
        signers.map(
          ({ signer, entry }): Signer => ({
            signer: signer.url,
            signerVersion: signer instanceof KeyPage ? signer.version : 1,
            account: signer,
          }),
        ),
      );
    },
    [principalAccount],
  );

  useEffect(() => {
    setSigners([]);
    if (theSigner || !web3?.linked) {
      return;
    }

    if (principalSigners?.length > 0) {
      if (principalSigners.length == 1) {
        setSelectedSigner(principalSigners[0]);
      } else {
        setSigners(principalSigners);
      }
      return;
    }

    const allSigners: Signer[] = [];
    if (web3.liteIdentity) {
      allSigners.push({
        signer: web3.liteIdentity.url,
        signerVersion: 1,
        account: web3.liteIdentity,
      });
    }

    const ethKeyHash = web3.publicKey.ethereum.replace(/^0x/, '').toLowerCase();
    for (const book of web3.linked.books) {
      for (const page of book.pages) {
        const ok = page.keys.some(
          (entry) =>
            Buffer.from(entry.publicKeyHash).toString('hex') === ethKeyHash,
        );
        if (ok) {
          allSigners.push({
            signer: page.url,
            signerVersion: page.version,
            account: page,
          });
        }
      }
    }

    if (allSigners.length == 1) {
      setSelectedSigner(allSigners[0]);
    } else {
      setSigners(allSigners);
    }
  }, [web3, principalSigners]);

  useEffect(() => {
    if (!selectedSigner?.account) {
      setBalance(null);
    } else {
      setBalance(selectedSigner.account.creditBalance);
    }
  }, [selectedSigner]);

  const updateFromTxn = (fields: Fields) => {
    try {
      const txn = new Transaction(makeTxn(fields));
      setPrincipal(txn.header?.principal);
      setFee(calculateTransactionFee(txn));
    } catch (error) {
      console.info(`Error while calculating fee`, error);
      setPrincipal(null);
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
          updateFromTxn(v);
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
