/* eslint-disable no-ex-assign */
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import {
  Alert,
  Badge,
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Tabs,
  Tooltip,
  Typography,
  message,
  notification,
} from 'antd';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAddCircleFill,
  RiInformationLine,
  RiKey2Line,
  RiListCheck,
  RiPenNibLine,
  RiQuestionLine,
  RiShutDownLine,
  RiStackLine,
  RiUserLine,
} from 'react-icons/ri';

import { AccountRecord, NetworkStatus } from 'accumulate.js/lib/api_v3';
import { Buffer } from 'accumulate.js/lib/common';
import {
  LiteIdentity,
  Transaction,
  TransactionArgs,
} from 'accumulate.js/lib/core';
import { Envelope } from 'accumulate.js/lib/messaging';

import { ethToAccumulate, truncateAddress } from '../../utils/web3';
import { Shared } from '../common/Network';
import { useShared } from '../common/Shared';
import { useAsyncEffect } from '../common/useAsync';
import { Settings } from './Settings';
import { Wallet } from './Wallet';
import { Ethereum, ethAddress, isLedgerError, liteIDForEth } from './utils';

const { Title, Paragraph, Text } = Typography;

export default function Component() {
  const { api } = useContext(Shared);

  const [isConnectWalletOpen, setIsConnectWalletOpen] = useState(false);
  const [isAddCreditsOpen, setIsAddCreditsOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useShared(
    Settings,
    'dashboardOpen',
  );

  const [ACME, setACME] = useState(null);
  const [ACMEError, setACMEError] = useState(null);

  const [liteIdentity, setLiteIdentity] = useState<LiteIdentity>(null);
  const [liteIdentityError, setLiteIdentityError] = useState(null);
  const [backupUrl, setBackupUrl] = useState(null);
  const [backupLDA, setBackupLDA] = useState(null);
  const [backupItems, setBackupItems] = useState([]);
  const [backupLDAError, setBackupLDAError] = useState(null);

  const [publicKey, setPublicKey] = useState<Uint8Array>(null);

  const [formAddCredits] = Form.useForm();
  const [formAddCreditsLiteTA, setFormAddCreditsLiteTA] = useState(null);
  const [formAddCreditsDestination, setFormAddCreditsDestination] =
    useState(null);
  const [formAddCreditsAmount, setFormAddCreditsAmount] = useState(null);

  const [formAddNote] = Form.useForm();
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  const [liteTokenAccount, setLiteTokenAccount] = useState(null);
  const [liteTokenAccountError, setLiteTokenAccountError] = useState(null);

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(null);
  const [networkStatusError, setNetworkStatusError] = useState(null);

  const [signWeb3Error, setSignWeb3Error] = useState(null);

  const [accAccount, setAccAccount] = useState(null);

  const { account, activate, deactivate } = useWeb3React();

  const injected = new InjectedConnector({});

  const connectWeb3 = async () => {
    if (Ethereum) {
      Wallet.connectWeb3();
      activate(injected);
      setIsConnectWalletOpen(false);
      setIsDashboardOpen(true);
    } else {
      message.warning('Web3 browser extension not found');
    }
  };

  const disconnect = async () => {
    Settings.connected = null;
    deactivate();
  };

  const query = async (url, setResult, setError) => {
    setResult(null);
    setError(null);
    try {
      setResult(await api.query(url));
    } catch (error) {
      setResult(null);
      setError(`${error}`);
    }
  };

  const queryBackup = async (url, setResult, setError) => {
    setError(null);
    try {
      let start = 1;
      while (true) {
        const r = await api.query(url, {
          queryType: 'chain',
          name: 'main',
          range: {
            start: start,
            expand: true,
          },
        });
        if (!r.records?.length) {
          return;
        }
        await setResult(r.asObject().records);
        start += r.records.length;
        if (start >= r.total) {
          return;
        }
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const getNetworkStatus = async () => {
    setNetworkStatus(null);
    setNetworkStatusError(null);
    try {
      const r = await api.networkStatus({ partition: 'directory' });
      setNetworkStatus(r);
    } catch (error) {
      setNetworkStatus(null);
      setNetworkStatusError(`${error}`);
    }
  };

  // loadPublicKey loads ethereum public key from local storage
  const loadPublicKey = async (account) => {
    const publicKey = Settings.getKey(account);
    if (publicKey && ethAddress(publicKey) === account) {
      setPublicKey(publicKey);
    }
  };

  const safe = (fn) => async () => {
    try {
      await fn();
    } catch (error) {
      console.log(error);
    }
  };

  // recoverPublicKey recovers ethereum public key from signed message and saves it into the local storage
  const recoverPublicKey = async () => {
    const publicKey = await checkSignError(Wallet.login(account));
    setPublicKey(publicKey);
    Settings.putKey(account, publicKey);
    setIsDashboardOpen(true);
  };

  const handleFormAddCredits = async () => {
    await signAccumulate({
      header: {
        principal: formAddCreditsLiteTA,
      },
      body: {
        type: 'addCredits',
        recipient: formAddCreditsDestination,
        amount: (
          (formAddCreditsAmount * 100 * Math.pow(10, 8)) /
          networkStatus.oracle.price
        ).toString(),
        oracle: networkStatus.oracle.price,
      },
    });

    setIsAddCreditsOpen(false);
  };

  const handleFormAddNote = async () => {
    const v = formAddNote.getFieldValue('value');
    const txn = await createBackupEntry(
      account,
      JSON.stringify({ type: 'note', value: v }),
    );
    await signAccumulate(txn);
    setIsAddNoteOpen(false);
  };

  const signAccumulate = async (args: Transaction | TransactionArgs) => {
    const txn = args instanceof Transaction ? args : new Transaction(args);
    const sig = await checkSignError(
      Wallet.signAccumulate(txn, {
        publicKey,
        signerVersion: 1,
        timestamp: Date.now(),
        signer: await liteIDForEth(publicKey),
      }),
    );
    if (!sig?.signature) {
      return;
    }

    const envelope = new Envelope({
      transaction: [txn],
      signatures: [sig],
    });

    console.log('Envelope:', envelope.asObject());
    const r = await api.submit(envelope);
    console.log(r);
  };

  const checkSignError = async (promise) => {
    try {
      setSignWeb3Error(null);
      return await promise;
    } catch (error) {
      error = isLedgerError(error);
      if ('message' in error) {
        error = error.message;
      }
      notification.error({ message: `${error}` });
      setSignWeb3Error(`${error}`);
    }
  };

  useAsyncEffect(
    async (mounted) => {
      setLiteIdentity(null);
      setLiteIdentityError(null);

      if (!publicKey) {
        return;
      }

      try {
        const url = await liteIDForEth(publicKey);
        const { account } = (await api.query(url)) as AccountRecord;
        if (!mounted() || !(account instanceof LiteIdentity)) {
          return;
        }
        setLiteIdentity(account);
      } catch (error) {
        setLiteIdentityError(`${error}`);
      }
    },
    [`${publicKey}`],
  );

  useAsyncEffect(
    async (mounted) => {
      if (account) {
        setFormAddCreditsLiteTA(null);
        setFormAddCreditsDestination(null);
        setLiteTokenAccount(null);
        setLiteTokenAccountError(null);
        setPublicKey(null);

        const liteIdentity = await ethToAccumulate(account);
        loadPublicKey(account);
        setAccAccount(liteIdentity);

        if (!publicKey) {
          return;
        }
        const entries = [];
        const backupLDA = await deriveBackupLDA(publicKey);
        setBackupUrl(backupLDA);
        await query(backupLDA, setBackupLDA, setBackupLDAError);
        await queryBackup(
          backupLDA,
          async (records) => {
            for (const r of records) {
              try {
                if ((window as any).decryptedBackupCache.has(r.entry)) {
                  entries.push(
                    (window as any).decryptedBackupCache.get(r.entry),
                  );
                  continue;
                }

                const plain = await decryptBackupEntry(
                  account,
                  r.value.message.transaction,
                );
                entries.push(plain);
                (window as any).decryptedBackupCache.set(r.entry, plain);
              } catch (error) {
                console.log(error);
              }
            }
          },
          setBackupLDAError,
        );
        localStorage.setItem(
          'backup',
          JSON.stringify(
            Object.fromEntries((window as any).decryptedBackupCache.entries()),
          ),
        );
        setBackupItems(entries);
      }
    },
    [account],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getNetworkStatus();
    query('ACME', setACME, setACMEError);
    if (Wallet.connected) {
      activate(injected);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`web3-module ${account ? 'connected' : null}`}>
      {!account ? (
        <div className="login">
          <Row align={'middle'}>
            <Col>
              <Button
                type="primary"
                onClick={() => setIsConnectWalletOpen(true)}
                shape="round"
                style={{ marginRight: 10 }}
              >
                Connect Wallet
              </Button>
            </Col>
            <Col>
              <IconContext.Provider
                value={{ className: 'react-icons react-icons-blue' }}
              >
                <RiInformationLine />
              </IconContext.Provider>
              Connect Web3 wallet to sign and submit txs on the Accumulate
              Network
            </Col>
          </Row>
        </div>
      ) : (
        <div className="account">
          <Row align={'middle'}>
            <Col className="account-connected">
              {publicKey ? (
                <Button shape="round" type="primary" onClick={() => {}}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiUserLine />
                  </IconContext.Provider>
                  {truncateAddress(account)}
                </Button>
              ) : (
                <Button
                  shape="round"
                  type="primary"
                  onClick={safe(recoverPublicKey)}
                >
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiPenNibLine />
                  </IconContext.Provider>
                  Sign to login
                </Button>
              )}
              <Button danger shape="round" type="primary" onClick={disconnect}>
                <IconContext.Provider
                  value={{ className: 'react-icons react-icons-only-icon' }}
                >
                  <RiShutDownLine />
                </IconContext.Provider>
              </Button>
            </Col>
          </Row>
          {!publicKey && (
            <Row style={{ paddingBottom: 8 }}>
              <Col>
                <IconContext.Provider
                  value={{ className: 'react-icons react-icons-blue' }}
                >
                  <RiInformationLine />
                </IconContext.Provider>
                Please sign a message containing{' '}
                <strong>only your public key</strong> to access all features
              </Col>
            </Row>
          )}
          {publicKey && isDashboardOpen && (
            <Row>
              <Col className="card-container">
                <Tabs defaultActiveKey="account" type="card">
                  {backupIsSupported() && (
                    <Tabs.TabPane>
                      <Paragraph>
                        <Divider />
                        {backupLDAError ? (
                          <Button
                            shape="round"
                            type="primary"
                            onClick={() => createBackupLDA()}
                          >
                            <IconContext.Provider
                              value={{ className: 'react-icons' }}
                            >
                              <RiAddCircleFill />
                            </IconContext.Provider>
                            Create
                          </Button>
                        ) : (
                          <>
                            {backupItems.map((x) => (
                              <pre>{JSON.stringify(x)}</pre>
                            ))}
                            <Button
                              shape="round"
                              type="primary"
                              onClick={() => setIsAddNoteOpen(true)}
                            >
                              <IconContext.Provider
                                value={{ className: 'react-icons' }}
                              >
                                <RiAddCircleFill />
                              </IconContext.Provider>
                              Add note
                            </Button>
                          </>
                        )}
                      </Paragraph>
                    </Tabs.TabPane>
                  )}
                  <Tabs.TabPane
                    tab={
                      <span>
                        <IconContext.Provider
                          value={{ className: 'react-icons' }}
                        >
                          <RiKey2Line />
                        </IconContext.Provider>
                        Key
                      </span>
                    }
                    key="key"
                  >
                    <Title level={5}>
                      Public Key
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title="Public key associated with your Ethereum address in the Accumulate network"
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                    </Title>
                    <Paragraph>
                      <Text copyable className="code">
                        {account.substring(2).toLowerCase()}
                      </Text>
                    </Paragraph>
                    <Title level={5}>
                      Public Key (uncompressed)
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title="The same public key (in the uncompressed format), that is used to sign txs on the Accumulate network"
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                    </Title>
                    <Paragraph>
                      <Text copyable className="code">
                        {publicKey
                          ? Buffer.from(publicKey).toString('hex')
                          : 'N/A'}
                      </Text>
                    </Paragraph>
                  </Tabs.TabPane>
                  <Tabs.TabPane
                    tab={
                      <span>
                        <IconContext.Provider
                          value={{ className: 'react-icons' }}
                        >
                          <RiStackLine />
                        </IconContext.Provider>
                        Key Pages
                      </span>
                    }
                    key="signers"
                  >
                    <Title level={5}>
                      Accumulate Key Pages
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title="Accumulate key pages contain a key or set of keys "
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                    </Title>
                  </Tabs.TabPane>
                  <Tabs.TabPane
                    tab={
                      <span>
                        <IconContext.Provider
                          value={{ className: 'react-icons' }}
                        >
                          <RiListCheck />
                        </IconContext.Provider>
                        Transactions
                        <Badge count={0} showZero />
                      </span>
                    }
                    key="actions"
                  >
                    <Title level={5}>Transactions</Title>
                  </Tabs.TabPane>
                </Tabs>
              </Col>
            </Row>
          )}
        </div>
      )}

      <Modal
        title="Add Credits"
        open={isAddCreditsOpen && account && !!liteIdentity}
        onCancel={() => {
          setIsAddCreditsOpen(false);
          setSignWeb3Error(null);
        }}
        footer={false}
      >
        <Alert
          showIcon
          type="info"
          message={<span>ACME tokens can be converted to credits</span>}
        />
        <Divider />
        <Divider />
        <Form form={formAddCredits} layout="vertical" className="modal-form">
          <Form.Item label="Price Oracle" className="text-row">
            {networkStatus?.oracle?.price && (
              <Text type="secondary">
                1 ACME = {networkStatus.oracle.price / 100} credits
              </Text>
            )}
            {networkStatusError && (
              <Alert
                showIcon
                type="error"
                message={<span>{networkStatusError}</span>}
              />
            )}
          </Form.Item>
          <Form.Item label="ACME Token Account">
            <Select
              value={formAddCreditsLiteTA}
              placeholder="Choose token account"
              onChange={(e) => {
                setFormAddCreditsLiteTA(e);
                query(e, setLiteTokenAccount, setLiteTokenAccountError);
              }}
            >
              <Select.Option
                value={`${accAccount}/ACME`}
              >{`${accAccount}/ACME`}</Select.Option>
            </Select>
            {!ACMEError &&
              ACME?.data?.precision &&
              liteTokenAccount?.data?.balance && (
                <Paragraph style={{ marginTop: 5, marginBottom: 0 }}>
                  <Text type="secondary">
                    Available balance:{' '}
                    {liteTokenAccount.data.balance
                      ? liteTokenAccount.data.balance /
                        Math.pow(10, ACME.data.precision)
                      : 0}
                     ACME
                  </Text>
                </Paragraph>
              )}
            {liteTokenAccountError && (
              <>
                <Divider />
                <Alert
                  showIcon
                  type="error"
                  message={<span>{liteTokenAccountError}</span>}
                />
              </>
            )}
          </Form.Item>
          <Form.Item label="Credits Destination">
            <Select
              value={formAddCreditsDestination}
              placeholder="Choose credits destination"
              onChange={setFormAddCreditsDestination}
            >
              <Select.Option value={accAccount}>{accAccount}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Amount">
            <InputNumber
              addonAfter="credits"
              placeholder="100"
              min={1}
              value={formAddCreditsAmount}
              onChange={setFormAddCreditsAmount}
            />
            {networkStatus?.oracle?.price && (
              <Paragraph style={{ marginTop: 5, marginBottom: 0 }}>
                <Text type="secondary">
                  {formAddCreditsAmount ? formAddCreditsAmount : 0} credits ={' '}
                  {formAddCreditsAmount
                    ? (formAddCreditsAmount * 100 * Math.pow(10, 8)) /
                      networkStatus.oracle.price /
                      Math.pow(10, 8)
                    : 0}
                   ACME
                </Text>
              </Paragraph>
            )}
          </Form.Item>
          <Form.Item>
            <Button
              onClick={handleFormAddCredits}
              type="primary"
              shape="round"
              size="large"
              // disabled={
              //   !liteTokenAccount ||
              //   !formAddCreditsDestination ||
              //   !formAddCreditsLiteTA ||
              //   !liteTokenAccount.data ||
              //   !liteTokenAccount.data.balance ||
              //   formAddCreditsAmount <= 0 ||
              //   (formAddCreditsAmount * 100 * Math.pow(10, 8)) /
              //     networkStatus.oracle.price >
              //     liteTokenAccount.data.balance
              //     ? true
              //     : false
              // }
            >
              Submit
            </Button>
            {signWeb3Error?.message && (
              <Paragraph style={{ marginTop: 10, marginBottom: 0 }}>
                <Text type="danger">{signWeb3Error.message}</Text>
              </Paragraph>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
