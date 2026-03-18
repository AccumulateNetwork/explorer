/**
 * WalletPanel - Sidebar panel for wallet integration
 *
 * Shows wallet connection status, available keys, and context-aware
 * transaction suggestions based on the current account being viewed.
 */

import {
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
  Drawer,
  Input,
  List,
  Modal,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiKey2Line,
  RiLockLine,
  RiLockUnlockLine,
  RiRefreshLine,
  RiSendPlaneLine,
  RiSettings3Line,
  RiWallet3Line,
  RiAddLine,
  RiUserAddLine,
  RiCoinLine,
  RiFileAddLine,
  RiEditLine,
  RiCheckLine,
  RiCloseLine,
  RiQuestionLine,
  RiTimeLine,
} from 'react-icons/ri';
import { useLocation } from 'react-router-dom';

import { useWallet } from './Context';
import { useCurrentAccount, CurrentTransaction } from './CurrentAccountContext';
import type { KeyInfo } from './WalletClient';

const { Panel } = Collapse;
const { Text, Title, Paragraph } = Typography;

interface TransactionSuggestion {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

interface WalletPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function WalletPanel({ visible, onClose }: WalletPanelProps) {
  const wallet = useWallet();
  const { currentAccount, currentTransaction } = useCurrentAccount();
  const location = useLocation();
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // Extract account URL from the current route or context
  const accountUrl = currentAccount?.url || extractAccountUrl(location.pathname);
  const accountType = currentAccount?.type || 'unknown';

  const handleConnect = useCallback(async () => {
    if (wallet) {
      await wallet.connect();
    }
  }, [wallet]);

  const handleUnlock = useCallback(async () => {
    if (!wallet || !passphrase) return;

    setUnlocking(true);
    try {
      await wallet.unlockVault(passphrase);
      setUnlockModalVisible(false);
      setPassphrase('');
      // Force a full reconnect to refresh all state
      await wallet.connect();
      message.success('Vault unlocked successfully');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to unlock vault');
    } finally {
      setUnlocking(false);
    }
  }, [wallet, passphrase]);

  // Get context-aware transaction suggestions
  const suggestions = getTransactionSuggestions(accountType, accountUrl, wallet?.keys || []);

  if (!wallet) {
    return (
      <Drawer
        title="Wallet"
        placement="right"
        onClose={onClose}
        open={visible}
        width={360}
      >
        <Alert
          type="warning"
          message="Wallet Not Available"
          description="The wallet context is not available. Make sure the WalletProvider is configured."
        />
      </Drawer>
    );
  }

  return (
    <Drawer
      title={
        <Space>
          <IconContext.Provider value={{ className: 'react-icons' }}>
            <RiWallet3Line />
          </IconContext.Provider>
          Accumulate Wallet
        </Space>
      }
      placement="right"
      onClose={onClose}
      open={visible}
      width={400}
      extra={
        <Space>
          <Tooltip title="Settings">
            <Button
              type="text"
              icon={
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiSettings3Line />
                </IconContext.Provider>
              }
            />
          </Tooltip>
          <Tooltip title="Refresh">
            <Button
              type="text"
              loading={wallet.connecting}
              onClick={() => wallet.connect()}
              icon={
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiRefreshLine />
                </IconContext.Provider>
              }
            />
          </Tooltip>
        </Space>
      }
    >
      {/* Connection Status */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Badge status={wallet.connected ? 'success' : 'error'} />
            <Text strong>
              {wallet.connected ? 'Connected' : 'Disconnected'}
            </Text>
          </Space>

          {wallet.error && (
            <Alert type="error" message={wallet.error} showIcon />
          )}

          {!wallet.connected && (
            <Button
              type="primary"
              loading={wallet.connecting}
              onClick={handleConnect}
              block
            >
              Connect to Wallet Daemon
            </Button>
          )}

          {wallet.connected && wallet.activeVault && (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">
                Vault: <Text strong>{wallet.activeVault.name}</Text>
              </Text>
              <Space>
                {wallet.activeVault.unlocked ? (
                  <Tag color="green" icon={
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                      <RiLockUnlockLine />
                    </IconContext.Provider>
                  }>
                    Unlocked
                  </Tag>
                ) : (
                  <>
                    <Tag color="orange" icon={
                      <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiLockLine />
                      </IconContext.Provider>
                    }>
                      Locked
                    </Tag>
                    <Button size="small" onClick={() => setUnlockModalVisible(true)}>
                      Unlock
                    </Button>
                  </>
                )}
              </Space>
            </Space>
          )}
        </Space>
      </Card>

      {/* Pending Transaction Actions */}
      {currentTransaction && currentTransaction.status === 'pending' && (
        <Card
          size="small"
          title={
            <Space>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiTimeLine />
              </IconContext.Provider>
              Pending Transaction
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">Type: </Text>
              <Text strong>{currentTransaction.type}</Text>
            </div>
            <div>
              <Text type="secondary">Principal: </Text>
              <Text copyable={{ text: currentTransaction.principal }}>
                {truncateHash(currentTransaction.principal, 12)}
              </Text>
            </div>
            {currentTransaction.isMultiSig && (
              <Tag color="purple">MULTI-SIG</Tag>
            )}
            <div>
              <Text type="secondary">Signatures: </Text>
              <Text strong>{currentTransaction.signatureCount}</Text>
            </div>

            {/* Transaction Actions */}
            <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Actions</Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  icon={
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                      <RiCheckLine />
                    </IconContext.Provider>
                  }
                  block
                  disabled={!wallet?.activeVault?.unlocked || wallet.keys.length === 0}
                  onClick={() => message.info('Sign transaction: ' + currentTransaction.hash)}
                >
                  Sign Transaction
                </Button>
                <Button
                  danger
                  icon={
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                      <RiCloseLine />
                    </IconContext.Provider>
                  }
                  block
                  disabled={!wallet?.activeVault?.unlocked || wallet.keys.length === 0}
                  onClick={() => message.info('Reject transaction: ' + currentTransaction.hash)}
                >
                  Reject Transaction
                </Button>
                <Button
                  icon={
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                      <RiQuestionLine />
                    </IconContext.Provider>
                  }
                  block
                  disabled={!wallet?.activeVault?.unlocked || wallet.keys.length === 0}
                  onClick={() => message.info('Abstain from transaction: ' + currentTransaction.hash)}
                >
                  Abstain
                </Button>
              </Space>
              {(!wallet?.activeVault?.unlocked || wallet.keys.length === 0) && (
                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: '0.85em' }}>
                  Unlock vault and ensure you have signing keys to perform actions
                </Text>
              )}
            </div>
          </Space>
        </Card>
      )}

      {/* Current Account Context */}
      {accountUrl && !currentTransaction && (
        <Card
          size="small"
          title="Current Account"
          style={{ marginBottom: 16 }}
        >
          <Paragraph ellipsis={{ rows: 2 }} copyable style={{ marginBottom: 8 }}>
            {accountUrl}
          </Paragraph>
          <Tag color="blue">{accountType}</Tag>
        </Card>
      )}

      {/* Transaction Suggestions */}
      {accountUrl && suggestions.length > 0 && (
        <Card
          size="small"
          title="Suggested Actions"
          style={{ marginBottom: 16 }}
        >
          <List
            size="small"
            dataSource={suggestions}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Tooltip title={item.disabled ? item.disabledReason : undefined}>
                    <Button
                      type="link"
                      size="small"
                      disabled={item.disabled}
                      onClick={item.action}
                    >
                      Execute
                    </Button>
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <IconContext.Provider value={{ className: 'react-icons', style: { fontSize: '1.5em' } }}>
                      {item.icon}
                    </IconContext.Provider>
                  }
                  title={item.title}
                  description={item.description}
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Available Keys */}
      <Collapse defaultActiveKey={wallet.activeVault?.unlocked ? ['keys'] : []}>
        <Panel
          header={
            <Space>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiKey2Line />
              </IconContext.Provider>
              Keys
              <Badge count={wallet.keys.length} style={{ backgroundColor: '#1890ff' }} />
            </Space>
          }
          key="keys"
        >
          {!wallet.activeVault?.unlocked ? (
            <Text type="secondary">Unlock vault to view keys</Text>
          ) : wallet.keys.length === 0 ? (
            <Text type="secondary">No keys in this vault</Text>
          ) : (
            <List
              size="small"
              dataSource={wallet.keys}
              renderItem={(key) => (
                <List.Item>
                  <List.Item.Meta
                    title={key.label || 'Unnamed'}
                    description={
                      <Space direction="vertical" size={0}>
                        <Tag>{key.type}</Tag>
                        <Text type="secondary" copyable={{ text: key.publicKeyHash }} style={{ fontSize: '0.8em' }}>
                          {truncateHash(key.publicKeyHash)}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Panel>
      </Collapse>

      {/* Unlock Modal */}
      <Modal
        title="Unlock Vault"
        open={unlockModalVisible}
        onOk={handleUnlock}
        onCancel={() => {
          setUnlockModalVisible(false);
          setPassphrase('');
        }}
        confirmLoading={unlocking}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>Enter the passphrase to unlock <Text strong>{wallet.activeVault?.name}</Text></Text>
          <Input.Password
            placeholder="Vault passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onPressEnter={handleUnlock}
          />
        </Space>
      </Modal>
    </Drawer>
  );
}

/**
 * Extract account URL from the route pathname
 */
function extractAccountUrl(pathname: string): string | null {
  // Match /acc/... routes
  const accMatch = pathname.match(/^\/acc\/(.+)/);
  if (accMatch) {
    return `acc://${accMatch[1]}`;
  }
  return null;
}

/**
 * Truncate a hash for display
 */
function truncateHash(hash: string, length = 8): string {
  if (!hash) return '';
  if (hash.length <= length * 2) return hash;
  return `${hash.slice(0, length)}...${hash.slice(-length)}`;
}

/**
 * Get context-aware transaction suggestions based on account type
 */
function getTransactionSuggestions(
  accountType: string,
  accountUrl: string | null,
  keys: KeyInfo[]
): TransactionSuggestion[] {
  if (!accountUrl) return [];

  const hasKeys = keys.length > 0;
  const noKeysReason = 'Unlock vault to access signing keys';

  const suggestions: TransactionSuggestion[] = [];

  switch (accountType.toLowerCase()) {
    case 'identity':
    case 'adi':
      suggestions.push(
        {
          title: 'Create Token Account',
          description: 'Create a new token account under this ADI',
          icon: <RiCoinLine />,
          action: () => message.info('Create token account for ' + accountUrl),
          disabled: !hasKeys,
          disabledReason: noKeysReason,
        },
        {
          title: 'Create Data Account',
          description: 'Create a data account for storing data entries',
          icon: <RiFileAddLine />,
          action: () => message.info('Create data account for ' + accountUrl),
          disabled: !hasKeys,
          disabledReason: noKeysReason,
        },
        {
          title: 'Create Sub-ADI',
          description: 'Create a nested identity under this ADI',
          icon: <RiUserAddLine />,
          action: () => message.info('Create sub-ADI under ' + accountUrl),
          disabled: !hasKeys,
          disabledReason: noKeysReason,
        },
        {
          title: 'Add Credits',
          description: 'Add credits to this ADI for transactions',
          icon: <RiAddLine />,
          action: () => message.info('Add credits to ' + accountUrl),
          disabled: !hasKeys,
          disabledReason: noKeysReason,
        }
      );
      break;

    case 'tokenaccount':
    case 'litetokenaccount':
      suggestions.push(
        {
          title: 'Send Tokens',
          description: 'Transfer tokens to another account',
          icon: <RiSendPlaneLine />,
          action: () => message.info('Send tokens from ' + accountUrl),
          disabled: !hasKeys,
          disabledReason: noKeysReason,
        },
        {
          title: 'Add Credits',
          description: 'Convert tokens to credits',
          icon: <RiAddLine />,
          action: () => message.info('Add credits from ' + accountUrl),
          disabled: !hasKeys,
          disabledReason: noKeysReason,
        }
      );
      break;

    case 'keybook':
      suggestions.push(
        {
          title: 'Create Key Page',
          description: 'Add a new key page to this book',
          icon: <RiAddLine />,
          action: () => message.info('Create key page in ' + accountUrl),
          disabled: !hasKeys,
          disabledReason: noKeysReason,
        }
      );
      break;

    case 'keypage':
      suggestions.push(
        {
          title: 'Add Key',
          description: 'Add a new key to this page',
          icon: <RiKey2Line />,
          action: () => message.info('Add key to ' + accountUrl),
          disabled: !hasKeys,
          disabledReason: noKeysReason,
        },
        {
          title: 'Update Threshold',
          description: 'Change the signature threshold',
          icon: <RiEditLine />,
          action: () => message.info('Update threshold for ' + accountUrl),
          disabled: !hasKeys,
          disabledReason: noKeysReason,
        },
        {
          title: 'Add Credits',
          description: 'Add credits for signing transactions',
          icon: <RiAddLine />,
          action: () => message.info('Add credits to ' + accountUrl),
          disabled: !hasKeys,
          disabledReason: noKeysReason,
        }
      );
      break;

    case 'dataaccount':
      suggestions.push(
        {
          title: 'Write Data Entry',
          description: 'Add a new data entry to this account',
          icon: <RiFileAddLine />,
          action: () => message.info('Write data to ' + accountUrl),
          disabled: !hasKeys,
          disabledReason: noKeysReason,
        }
      );
      break;

    case 'liteidentity':
      suggestions.push(
        {
          title: 'Add Credits',
          description: 'Add credits to this lite identity',
          icon: <RiAddLine />,
          action: () => message.info('Add credits to ' + accountUrl),
          disabled: !hasKeys,
          disabledReason: noKeysReason,
        }
      );
      break;

    default:
      // Generic suggestions for unknown account types
      suggestions.push(
        {
          title: 'View Transaction History',
          description: 'See recent transactions for this account',
          icon: <RiFileAddLine />,
          action: () => message.info('View history for ' + accountUrl),
        }
      );
  }

  return suggestions;
}

/**
 * Floating button to toggle the wallet panel
 */
export function WalletToggleButton({ onClick }: { onClick: () => void }) {
  const wallet = useWallet();

  return (
    <Tooltip title="Open Wallet">
      <Button
        type="primary"
        shape="circle"
        size="large"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
        onClick={onClick}
        icon={
          <Badge dot={wallet?.connected} offset={[-4, 4]}>
            <IconContext.Provider value={{ style: { fontSize: '1.5em' } }}>
              <RiWallet3Line />
            </IconContext.Provider>
          </Badge>
        }
      />
    </Tooltip>
  );
}
