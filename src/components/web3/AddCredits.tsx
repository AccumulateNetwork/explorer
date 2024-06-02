import { useWeb3React } from '@web3-react/core';
import {
  Alert,
  Button,
  Divider,
  Form,
  FormInstance,
  InputNumber,
  Modal,
  Select,
  Spin,
  Typography,
} from 'antd';
import React, { useContext, useState } from 'react';

import { NetworkStatus, RecordType } from 'accumulate.js/lib/api_v3';
import { LiteTokenAccount } from 'accumulate.js/lib/core';

import { isRecordOf } from '../../utils/types';
import { CreditAmount, TokenAmount } from '../common/Amount';
import { Shared } from '../common/Network';
import { ShowError } from '../common/ShowError';
import { queryEffect } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { Settings } from './Settings';
import { liteIDForEth } from './utils';

const { Text, Paragraph } = Typography;

export function AddCredits({
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

  // Get the oracle
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(null);
  const [networkStatusError, setNetworkStatusError] = useState(null);

  const { api } = useContext(Shared);
  useAsyncEffect(async (mounted) => {
    setNetworkStatusError(null);
    try {
      const r = await api.networkStatus({});
      if (!mounted()) {
        return;
      }
      setNetworkStatus(r);
      form.setFieldValue('oracle', r?.oracle?.price);
    } catch (error) {
      setNetworkStatusError(error);
    }
  });

  // Calculate the lite identity
  const { account: eth } = useWeb3React();
  const [identityUrl, setIdentityUrl] = useState<string>();

  useAsyncEffect(
    async (mounted) => {
      const publicKey = Settings.getKey(eth);
      if (!publicKey) {
        return;
      }

      const url = await liteIDForEth(publicKey);
      if (mounted()) {
        setIdentityUrl(url);
      }
    },
    [eth],
  );

  // Query the token account
  const [tokenAccountUrl, setTokenAccountUrl] = useState<string>();
  const [tokenAccount, setTokenAccount] = useState<LiteTokenAccount>();
  const [tokenAccountError, setTokenAccountError] = useState<any>();

  queryEffect(tokenAccountUrl)
    .then((r) => {
      if (r.recordType === RecordType.Error) {
        setTokenAccountError(r.value);
        return;
      }
      if (
        !isRecordOf(r, LiteTokenAccount) ||
        r.account.tokenUrl.toString().toLowerCase() !== 'acc://acme'
      ) {
        setTokenAccountError(
          `An unexpected error occurred while fetching ${tokenAccountUrl}`,
        );
        return;
      }
      setTokenAccount(r.account);
    })
    .catch(setTokenAccountError);

  const ready = () =>
    tokenAccount &&
    networkStatus &&
    form.getFieldValue('tokenAccount') &&
    form.getFieldValue('recipient') &&
    form.getFieldValue('credits');

  const Cost = () => {
    if (!networkStatus?.oracle?.price) {
      return false;
    }
    const credits = Number(form.getFieldValue('credits'));
    if (isNaN(credits)) {
      return false;
    }
    // 1000 credits * credit precision (10^2) / (credits per acme) * acme precision (10^8)
    const acme = ((credits * 10 ** 2) / networkStatus.oracle.price) * 10 ** 8;

    form.setFieldValue('tokens', acme);

    return (
      <Paragraph style={{ marginTop: 5, marginBottom: 0 }}>
        <Text type="secondary">
          <CreditAmount bare amount={credits} /> ={' '}
          <TokenAmount bare amount={acme} issuer="ACME" />
        </Text>
      </Paragraph>
    );
  };

  return (
    <Modal
      title="Add Credits"
      open={open}
      onCancel={onCancel}
      footer={false}
      forceRender
    >
      <Alert
        showIcon
        type="info"
        message={<span>ACME tokens can be converted to credits</span>}
      />
      <Divider />
      <Divider />
      <Form
        form={form}
        layout="vertical"
        className="modal-form"
        preserve={false}
      >
        <Form.Item label="Price Oracle" className="text-row">
          {networkStatus?.oracle?.price && (
            <Text type="secondary">
              1 ACME = {networkStatus.oracle.price / 100} credits
            </Text>
          )}
          {networkStatusError && <ShowError error={networkStatusError} />}
        </Form.Item>
        <Form.Item label="ACME Token Account">
          <Form.Item noStyle name="tokenAccount">
            <Select
              placeholder="Choose token account"
              onChange={(e) => setTokenAccountUrl(e)}
            >
              <Select.Option
                value={`${identityUrl}/ACME`}
              >{`${identityUrl}/ACME`}</Select.Option>
            </Select>
          </Form.Item>
          {tokenAccount && (
            <Paragraph style={{ marginTop: 5, marginBottom: 0 }}>
              <Text type="secondary">
                Available balance:{' '}
                <TokenAmount amount={tokenAccount?.balance} issuer={'ACME'} />
              </Text>
            </Paragraph>
          )}
          {tokenAccountError && <ShowError error={tokenAccountError} />}
        </Form.Item>
        <Form.Item label="Credits Destination" name="recipient">
          <Select placeholder="Choose credits destination">
            <Select.Option value={identityUrl || ''}>
              {identityUrl}
            </Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="Amount">
          <Form.Item noStyle name="credits">
            <InputNumber addonAfter="credits" placeholder="100" min={1} />
          </Form.Item>
          <Cost />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            shape="round"
            size="large"
            disabled={!ready() || pending}
            children={pending ? <Spin /> : 'Submit'}
            onClick={async () => {
              setPending(true);
              try {
                await onSubmit();
              } finally {
                setPending(false);
              }
            }}
          />
          {children}
        </Form.Item>
      </Form>
    </Modal>
  );
}
