/**
 * WalletPanel — drawer UI for the local wallet integration.
 *
 * Talks to the same-origin wallet API through WalletContext. Every action
 * here calls the real daemon; there are no placeholder stubs.
 */
import {
  Alert,
  AutoComplete,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import React, { useContext, useState } from 'react';
import {
  RiLockLine,
  RiLockUnlockLine,
  RiRefreshLine,
  RiWallet3Line,
} from 'react-icons/ri';

import { Network } from '../common/Network';
import { useWallet } from './Context';

// Wallet keys report a bare lite identity (hex); the faucet funds its ACME
// token account. Leave a full acc:// URL the user typed untouched.
const toTokenAccount = (liteAddress: string) =>
  liteAddress.startsWith('acc://') ? liteAddress : `acc://${liteAddress}/ACME`;

const { Text } = Typography;

export function WalletToggleButton({ onClick }: { onClick: () => void }) {
  const wallet = useWallet();
  return (
    <Button
      type="text"
      icon={<RiWallet3Line />}
      onClick={onClick}
      aria-label="Wallet"
    >
      Wallet{wallet?.connected ? '' : ' (offline)'}
    </Button>
  );
}

interface WalletPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function WalletPanel({ visible, onClose }: WalletPanelProps) {
  const wallet = useWallet();

  return (
    <Drawer
      title={
        <Space>
          Accumulate Wallet
          {wallet && <Tag color="geekblue">{wallet.networkLabel}</Tag>}
        </Space>
      }
      placement="right"
      width={420}
      open={visible}
      onClose={onClose}
      extra={
        wallet?.connected && (
          <Button
            size="small"
            icon={<RiRefreshLine />}
            onClick={() => wallet.refresh()}
          >
            Refresh
          </Button>
        )
      }
    >
      {wallet ? <PanelBody /> : <Empty description="Wallet unavailable" />}
    </Drawer>
  );
}

function PanelBody() {
  const wallet = useWallet()!;
  const { connected, connecting, error, status, activeVault, networkLabel } =
    wallet;

  if (connecting) {
    return <Spin tip={`Connecting to the ${networkLabel} wallet…`} />;
  }

  if (!connected) {
    // Lazy: nothing is touched until the user connects, and the button names
    // the network so the user knows which wallet they are about to open.
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {error && <Alert type="warning" message={error} showIcon />}
        <Text type="secondary">
          Connect to your <strong>{networkLabel}</strong> wallet (served by{' '}
          <code>ccli webui</code>).
        </Text>
        <Button type="primary" onClick={() => wallet.connect()}>
          Connect to {networkLabel} wallet
        </Button>
      </Space>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <VaultSection />
      {activeVault && !activeVault.unlocked && <UnlockSection />}
      {activeVault?.unlocked && (
        <>
          <KeysSection />
          <AccountsSection />
          <FaucetForm />
        </>
      )}
      {status && status.vaults.length === 0 && (
        <Empty description="No vaults in this wallet" />
      )}
    </Space>
  );
}

function VaultSection() {
  const { status, activeVault, selectVault } = useWallet()!;
  if (!status || status.vaults.length === 0) return null;

  return (
    <div>
      <Text strong>Vault</Text>
      <Select
        style={{ width: '100%', marginTop: 8 }}
        value={activeVault?.name}
        onChange={(name) => selectVault(name)}
        options={status.vaults.map((v) => ({
          value: v.name,
          label: (
            <Space>
              {v.unlocked ? <RiLockUnlockLine /> : <RiLockLine />}
              {v.name || '(default)'}
              <Tag>{v.keyCount} keys</Tag>
            </Space>
          ),
        }))}
      />
    </div>
  );
}

// UnlockSection prefers a NATIVE password prompt (pinentry) so the passphrase
// never enters the browser. It only falls back to an in-browser form if the
// daemon reports no native prompt is available. Either way the prompt names
// the network so the user knows which wallet they are unlocking.
function UnlockSection() {
  const { unlockInteractive, activeVault, networkLabel } = useWallet()!;
  const [waiting, setWaiting] = useState(false);
  const [useForm, setUseForm] = useState(false);

  const unlockNatively = async () => {
    setWaiting(true);
    try {
      await unlockInteractive();
      message.success(`${networkLabel} wallet unlocked`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unlock failed';
      if (msg.includes('interactive unlock unavailable')) {
        // No pinentry / no terminal on the daemon host — fall back to a form.
        setUseForm(true);
      } else {
        message.error(msg); // canceled, wrong password, etc.
      }
    } finally {
      setWaiting(false);
    }
  };

  if (useForm) {
    return <UnlockForm />;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message={
          <span>
            Unlock the <strong>{networkLabel}</strong> wallet
            {activeVault?.name ? ` (vault “${activeVault.name}”)` : ''}
          </span>
        }
        description="You'll be prompted for the passphrase in a secure system dialog — it is never entered in the browser."
      />
      <Button type="primary" loading={waiting} block onClick={unlockNatively}>
        {waiting
          ? 'Waiting for the system password prompt…'
          : `Unlock ${networkLabel} wallet`}
      </Button>
    </Space>
  );
}

// Fallback only: used when the daemon has no native prompt available.
function UnlockForm() {
  const { unlockVault, activeVault, networkLabel } = useWallet()!;
  const [busy, setBusy] = useState(false);

  const onFinish = async ({ passphrase }: { passphrase: string }) => {
    setBusy(true);
    try {
      await unlockVault(passphrase);
      message.success(`${networkLabel} wallet unlocked`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Unlock failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Form layout="vertical" onFinish={onFinish}>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message={
          <span>
            Unlocking the <strong>{networkLabel}</strong> wallet
            {activeVault?.name ? ` (vault “${activeVault.name}”)` : ''}
          </span>
        }
        description="No system password dialog is available, so the passphrase is entered here."
      />
      <Form.Item
        label={`${networkLabel} wallet passphrase`}
        name="passphrase"
        rules={[{ required: true, message: 'Enter the vault passphrase' }]}
      >
        <Input.Password autoComplete="off" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={busy} block>
        Unlock {networkLabel} wallet
      </Button>
    </Form>
  );
}

function KeysSection() {
  const { keys } = useWallet()!;
  return (
    <div>
      <Text strong>Keys</Text>
      <List
        size="small"
        dataSource={keys}
        locale={{ emptyText: 'No keys' }}
        renderItem={(k) => (
          <List.Item>
            <List.Item.Meta
              title={k.label}
              description={
                <Text copyable style={{ fontSize: 12 }}>
                  {k.liteAddress}
                </Text>
              }
            />
            {k.balance && <Tag color="blue">{k.balance}</Tag>}
          </List.Item>
        )}
      />
    </div>
  );
}

function AccountsSection() {
  const { accounts } = useWallet()!;
  if (accounts.length === 0) return null;
  return (
    <div>
      <Text strong>Accounts</Text>
      <List
        size="small"
        dataSource={accounts}
        renderItem={(a) => (
          <List.Item>
            <List.Item.Meta
              title={
                <Text copyable style={{ fontSize: 13 }}>
                  {a.url}
                </Text>
              }
              description={a.type}
            />
            {a.balance && <Tag color="blue">{a.balance}</Tag>}
          </List.Item>
        )}
      />
    </div>
  );
}

function FaucetForm() {
  const { keys, generateKey } = useWallet()!;
  const { api } = useContext(Network);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [to, setTo] = useState(keys[0]?.liteAddress ?? '');
  const [newLabel, setNewLabel] = useState('');

  // Searchable over label and address, so the user can find a key or paste an
  // account they already know.
  const options = keys.map((k) => ({
    value: k.liteAddress,
    label: `${k.label} — ${k.liteAddress}`,
  }));

  const requestTokens = async () => {
    if (!to.trim()) {
      message.error('Choose a key or enter a lite account');
      return;
    }
    setBusy(true);
    try {
      // Fund through the selected network's faucet directly (no wallet
      // signature needed to receive), the same path the Explorer faucet uses.
      const res = await api.faucet(toTokenAccount(to.trim()));
      if (res && res?.status?.txID) message.success('Faucet request submitted');
      else message.error('Faucet request failed');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Faucet failed');
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!newLabel.trim()) {
      message.error('Enter a label for the new key');
      return;
    }
    setGenerating(true);
    try {
      const key = await generateKey(newLabel.trim());
      setTo(key.liteAddress); // select the new key as the faucet target
      setNewLabel('');
      message.success(`Generated key “${key.label}”`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Generate failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Text strong>Faucet</Text>
      <AutoComplete
        style={{ width: '100%' }}
        value={to}
        onChange={setTo}
        options={options}
        allowClear
        placeholder="Search your keys or paste a lite account…"
        filterOption={(input, option) =>
          String(option?.label ?? '')
            .toLowerCase()
            .includes(input.toLowerCase())
        }
      />
      <Button type="primary" loading={busy} block onClick={requestTokens}>
        Request Tokens
      </Button>
      <Text type="secondary" style={{ fontSize: 12 }}>
        No key yet? Generate one to receive funds:
      </Text>
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
  );
}
