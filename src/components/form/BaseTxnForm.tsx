import { DownOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Dropdown,
  Form,
  FormInstance,
  Modal,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import React, { useContext, useEffect, useState } from 'react';

import { URL } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import {
  FeeSchedule,
  KeyPage,
  LiteIdentity,
  Transaction,
  TransactionArgs,
} from 'accumulate.js/lib/core';

import { isRecordOf } from '../../utils/types';
import { isLite } from '../../utils/url';
import { CreditAmount } from '../common/Amount';
import { Network } from '../common/Network';
import { isErrorRecord, queryEffect } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { useIsMounted } from '../common/useIsMounted';
import { useWeb3 } from '../web3/Context';
import { AddCredits } from './AddCredits';
import { Sign } from './Sign';
import { calculateTransactionFee } from './fees';
import { getSigners } from './utils';

const { Text } = Typography;

export namespace TxnForm {
  export type Signer = Sign.Signer & { account: KeyPage | LiteIdentity };

  export interface Props {
    open: boolean;
    signer?: Signer;
    onCancel: () => any;
    onFinish: (ok: boolean) => any;
  }
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
  onSignerChange,
}: {
  title: string;
  form: FormInstance;
  children: React.ReactNode;
  submit(values: Fields): TransactionArgs;
  onValuesChange?(values: Fields): void;
  onSignerChange?(signer: TxnForm.Signer | undefined): void;
} & TxnForm.Props) {
  const web3 = useWeb3();
  const { api, onApiError } = useContext(Network);
  const [signRequest, setSignRequest] = useState<Sign.Request>();
  const [isSigning, setIsSigning] = useState(false);
  const [signers, setSigners] = useState<TxnForm.Signer[]>([]);
  const [selectedSigner, setSelectedSigner] = useState<
    TxnForm.Signer | undefined
  >(theSigner);
  const [principal, setPrincipal] = useState<URL>();
  const [principalSigners, setPrincipalSigners] = useState<TxnForm.Signer[]>();
  const [fee, setFee] = useState(0);
  const [feeSchedule, setFeeSchedule] = useState<FeeSchedule>();
  const [balance, setBalance] = useState<number>();

  const [buyingCredits, setBuyingCredits] = useState(false);

  useAsyncEffect(
    async (mounted) => {
      if (!principal) {
        return;
      }

      const r = await api.query(principal).catch(isErrorRecord);
      if (r.recordType !== RecordType.Account) {
        return;
      }

      const signers = await getSigners(api, web3, r.account!);
      if (!mounted()) {
        return;
      }
      setPrincipalSigners(signers);
    },
    [principal],
  ).catch((err) => onApiError(err));

  useAsyncEffect(async (isMounted) => {
    const { globals } = await api.networkStatus({ partition: 'Directory' });
    if (!isMounted()) return;
    setFeeSchedule(globals!.feeSchedule);
  }, []);

  useEffect(() => {
    onSignerChange?.(selectedSigner);
  }, [selectedSigner]);

  useEffect(() => {
    setSigners([]);
    if (theSigner || !web3?.linked) {
      return;
    }

    if (principalSigners?.length) {
      if (principalSigners.length == 1) {
        setSelectedSigner(principalSigners[0]);
      } else {
        setSigners(principalSigners);
      }
      return;
    }

    // Lite identities
    const allSigners: TxnForm.Signer[] = [];
    for (const account of web3.accounts) {
      if (account.exists) {
        allSigners.push({
          signer: account.liteIdentity.url!,
          signerVersion: 1,
          account: account.liteIdentity,
          key: account,
        });
      }
    }

    // Key books
    const keys = new Map(
      web3.accounts.map((x) => [x.address.replace(/^0x/, '').toLowerCase(), x]),
    );
    for (const book of web3.linked.books) {
      for (const page of book.pages) {
        const [key] = page
          .keys!.map((x) =>
            keys.get(Buffer.from(x!.publicKeyHash!).toString('hex')),
          )
          .filter((x) => !!x);
        if (key) {
          allSigners.push({
            signer: page.url!,
            signerVersion: page.version!,
            account: page,
            key,
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

  // Reload the signer after buying credits
  queryEffect(selectedSigner?.account?.url, undefined, [buyingCredits]).then(
    (r) => {
      if (isRecordOf(r, KeyPage, LiteIdentity)) {
        setSelectedSigner({
          ...selectedSigner!,
          account: r.account!,
        });
      }
    },
  );

  useEffect(() => {
    if (!selectedSigner?.account) {
      setBalance(undefined);
    } else {
      setBalance(selectedSigner.account!.creditBalance! || 0);
    }
  }, [selectedSigner]);

  const updateFromTxn = (fields: Fields) => {
    try {
      const txn = new Transaction(makeTxn(fields));
      setPrincipal(txn.header?.principal);
      setFee(calculateTransactionFee(txn, feeSchedule));
    } catch (error) {
      console.info(`Error while calculating fee`, error);
      setPrincipal(undefined);
      setFee(0);
    }
  };

  // Initialize the fee
  useEffect(() => updateFromTxn(form.getFieldsValue()), [form, feeSchedule]);

  const isMounted = useIsMounted();
  const submit = async (fields: Fields) => {
    if (!selectedSigner) return;
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

  const [canSubmit, setCanSubmit] = useState(true);
  const submitBtn =
    fee && balance != null && balance < fee ? (
      <Tooltip title="Insufficient balance">
        <Button type="primary" disabled>
          <SignWith />
        </Button>
      </Tooltip>
    ) : (
      <Button
        type="primary"
        loading={isSigning}
        onClick={() => {
          form.submit();
        }}
        disabled={!canSubmit}
      >
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
        onFieldsChange={(_, f) => {
          setCanSubmit(f.every((x) => !(x.errors?.length > 0)));
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

            {balance != null && balance < fee && (
              <Form.Item label="&nbsp;">
                <Tooltip title="Purchase credits">
                  <Button
                    shape="circle"
                    size="small"
                    style={{
                      borderRadius: '50%', // Override Space.Compact styling
                    }}
                    onClick={() => setBuyingCredits(true)}
                  >
                    <PlusOutlined />
                  </Button>
                </Tooltip>
                <AddCredits
                  to={selectedSigner?.account.url}
                  open={buyingCredits}
                  onCancel={() => setBuyingCredits(false)}
                  onFinish={(ok) => ok && setBuyingCredits(false)}
                />
              </Form.Item>
            )}
          </Space.Compact>
        )}
      </Form>

      <Sign request={signRequest} />
    </Modal>
  );
}
