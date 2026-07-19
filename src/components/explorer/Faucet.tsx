import {
  Alert,
  AutoComplete,
  Button,
  Input,
  Space,
  Typography,
  message,
} from 'antd';
import React, { useContext, useEffect, useState } from 'react';

import { TxID } from 'accumulate.js';

import { Link } from '../common/Link';
import { Network } from '../common/Network';
import { useWallet } from '../wallet/Context';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

// Wallet keys report a bare lite identity (hex); the faucet funds its ACME
// token account. Leave a full acc:// URL the user typed untouched.
const toTokenAccount = (liteAddress: string) =>
  liteAddress.startsWith('acc://')
    ? liteAddress
    : `acc://${liteAddress}/ACME`;

const Faucet = () => {
  const [loading, setLoading] = useState(false);
  const [txid, setTxid] = useState<TxID>(null);
  const [error, setError] = useState<string>(null);
  const [value, setValue] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [generating, setGenerating] = useState(false);

  const { api } = useContext(Network);
  // Null in the production build (no wallet); the page then shows only the
  // plain token-account input, exactly as before.
  const wallet = useWallet();

  const handleFaucet = async (raw: string) => {
    const url = (raw || '').trim();
    if (!url) return;
    setLoading(true);
    setTxid(null);
    setError(null);
    try {
      const response = await api.faucet(url);
      if (response && response?.status?.txID) {
        setTxid(response.status.txID);
      } else {
        setError('Unable to fund ' + url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fund ' + url);
    } finally {
      setLoading(false);
    }
  };

  const generate = async () => {
    if (!wallet || !newLabel.trim()) return;
    setGenerating(true);
    try {
      const key = await wallet.generateKey(newLabel.trim());
      setValue(toTokenAccount(key.liteAddress));
      setNewLabel('');
      message.success(`Generated key “${key.label}”`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Generate failed');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    document.title = 'Faucet | Accumulate Explorer';
  }, []);

  const keyOptions = (wallet?.keys ?? []).map((k) => ({
    value: toTokenAccount(k.liteAddress),
    label: `${k.label} — ${k.liteAddress}`,
  }));

  return (
    <div>
      <Title level={2}>Faucet</Title>
      <Paragraph>
        <Alert message="This is the testnet faucet" type="info" showIcon />
      </Paragraph>

      {wallet && (
        <Paragraph>
          {wallet.connected ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">
                Fund one of your wallet keys, or generate a new one:
              </Text>
              <AutoComplete
                style={{ width: '100%' }}
                options={keyOptions}
                value={value}
                onChange={setValue}
                allowClear
                size="large"
                placeholder="Search your keys by label or address…"
                filterOption={(input, option) =>
                  String(option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="New key label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onPressEnter={generate}
                />
                <Button loading={generating} onClick={generate}>
                  Generate key
                </Button>
              </Space.Compact>
            </Space>
          ) : (
            <Button
              onClick={() => wallet.connect()}
              loading={wallet.connecting}
            >
              Connect wallet to pick or generate a key
            </Button>
          )}
        </Paragraph>
      )}

      <Paragraph>
        <Search
          placeholder="Enter token account"
          allowClear
          enterButton="Get ACME"
          size="large"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onSearch={handleFaucet}
          loading={loading}
          spellCheck={false}
          autoComplete="off"
          disabled={loading}
        />
      </Paragraph>

      {txid ? (
        <div>
          <Alert
            type="success"
            message={<Link to={txid}>{txid.toString()}</Link>}
            showIcon
          />
        </div>
      ) : null}
      {error ? (
        <div>
          <Alert type="error" message={error} showIcon />
        </div>
      ) : null}
    </div>
  );
};

export default Faucet;
