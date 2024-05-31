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
  Skeleton,
  Tabs,
  Tooltip,
  Typography,
  message,
  notification,
} from 'antd';
import EthCrypto from 'eth-crypto';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { LuDatabaseBackup } from 'react-icons/lu';
import {
  RiAccountCircleLine,
  RiAddCircleFill,
  RiExternalLinkLine,
  RiInformationLine,
  RiKey2Line,
  RiListCheck,
  RiPenNibLine,
  RiQuestionLine,
  RiShutDownLine,
  RiStackLine,
  RiUserLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';
import Web3 from 'web3';

import { Buffer, sha256 } from 'accumulate.js/lib/common';
import { Transaction } from 'accumulate.js/lib/core';
import { ETHSignature } from 'accumulate.js/lib/core';
import { Envelope } from 'accumulate.js/lib/messaging';

import {
  backupIsSupported,
  createBackupEntry,
  createBackupLDATxn,
  decryptBackupEntry,
  deriveBackupLDA,
  ethToUniversal,
} from '../../utils/backup';
import {
  ethAddress,
  ethToAccumulate,
  joinBuffers,
  rsvSigToDER,
  sigMdHash,
  truncateAddress,
} from '../../utils/web3';
import { Shared } from '../common/Shared';
import { useAsyncEffect } from '../common/useAsync';

const { Title, Paragraph, Text } = Typography;

const Ethereum = 'ethereum' in window ? (window.ethereum as any) : void 0;

const TabsPane = (Tabs as any).Pane;

// Cache decrypted messages to avoid asking the user to decrypt every single
// time the component renders. This is ok as long as the messages aren't
// sensitive.
if (!(window as any).decryptedBackupCache) {
  (window as any).decryptedBackupCache = new Map();

  const v = localStorage.getItem('backup');
  if (v)
    try {
      for (const [key, value] of Object.entries(JSON.parse(v))) {
        (window as any).decryptedBackupCache.set(key, value);
      }
    } catch (error) {
      console.log(error);
    }
}

export default function Component() {
  const { api } = useContext(Shared);

  const [isConnectWalletOpen, setIsConnectWalletOpen] = useState(false);
  const [isAddCreditsOpen, setIsAddCreditsOpen] = useState(false);

  const [isDashboardOpen, setIsDashboardOpen] = useState(
    localStorage.getItem('isDashboardOpen') ? true : false,
  );

  const [ACME, setACME] = useState(null);
  const [ACMEError, setACMEError] = useState(null);

  const [liteIdentity, setLiteIdentity] = useState(null);
  const [liteIdentityError, setLiteIdentityError] = useState(null);
  const [backupUrl, setBackupUrl] = useState(null);
  const [backupLDA, setBackupLDA] = useState(null);
  const [backupItems, setBackupItems] = useState([]);
  const [backupLDAError, setBackupLDAError] = useState(null);

  const [publicKey, setPublicKey] = useState(null);

  const [formAddCredits] = Form.useForm();
  const [formAddCreditsLiteTA, setFormAddCreditsLiteTA] = useState(null);
  const [formAddCreditsDestination, setFormAddCreditsDestination] =
    useState(null);
  const [formAddCreditsAmount, setFormAddCreditsAmount] = useState(null);

  const [formAddNote] = Form.useForm();
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  const [liteTokenAccount, setLiteTokenAccount] = useState(null);
  const [liteTokenAccountError, setLiteTokenAccountError] = useState(null);

  const [networkStatus, setNetworkStatus] = useState(null);
  const [networkStatusError, setNetworkStatusError] = useState(null);

  const [web3, setWeb3] = useState(null);
  const [signWeb3Error, setSignWeb3Error] = useState(null);

  const [accAccount, setAccAccount] = useState(null);

  const { account, activate, deactivate } = useWeb3React();

  const toggleDashboard = () => {
    if (!isDashboardOpen) {
      localStorage.setItem('isDashboardOpen', 'true');
    } else {
      localStorage.removeItem('isDashboardOpen');
    }
    setIsDashboardOpen(!isDashboardOpen);
  };

  const injected = new InjectedConnector({});

  const connectWeb3 = async () => {
    if (Ethereum) {
      setWeb3(new Web3(Ethereum));
      activate(injected);
      localStorage.setItem('connected', 'Web3');
      setIsConnectWalletOpen(false);
      if (!isDashboardOpen) {
        toggleDashboard();
      }
    } else {
      message.warning('Web3 browser extension not found');
    }
  };

  const disconnect = async () => {
    localStorage.removeItem(`${account}`);
    localStorage.removeItem('connected');
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
      setNetworkStatus(r.oracle.price);
    } catch (error) {
      setNetworkStatus(null);
      setNetworkStatusError(`${error}`);
    }
  };

  // loadPublicKey loads ethereum public key from local storage
  const loadPublicKey = async (account) => {
    let pub = localStorage.getItem(account);

    // need more complex check here
    if (pub && ethAddress(pub) === account) {
      setPublicKey(pub);
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
    localStorage.removeItem(`${account}`);

    let message = 'Login to Accumulate';
    let signature = await signWeb3(web3.utils.utf8ToHex(message), true);
    if (!signature) return;

    console.log('Message:', message);
    console.log('Signature:', signature);

    let pub = EthCrypto.recoverPublicKey(
      signature,
      web3.eth.accounts.hashMessage(message),
    );
    console.log('Public key:', pub);
    if (ethAddress(pub) !== account) {
      notification.error({ message: 'Failed to recover public key' });
      return;
    }

    setPublicKey(pub);
    localStorage.setItem(account, pub);
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

  const createBackupLDA = async () => {
    await signAccumulate(
      await createBackupLDATxn(await ethToUniversal(account)),
    );
  };

  const handleFormAddNote = async () => {
    const v = formAddNote.getFieldValue('value');
    const txn = await createBackupEntry(account, { type: 'note', value: v });
    await signAccumulate(txn);
    setIsAddNoteOpen(false);
  };

  const signAccumulate = async (args) => {
    let upk = '04' + publicKey;

    let sig = new ETHSignature({
      signer: await ethToAccumulate(account),
      signerVersion: 1,
      timestamp: Date.now(),
      publicKey: upk,
    });

    console.log('Signature:', sig);

    let sigHash = await sigMdHash(sig);
    console.log('SigMdHash:', sigHash.toString('hex'));

    if (typeof args.asObject === 'function') {
      args = args.asObject();
    }
    let tx = new Transaction({
      header: {
        ...args.header,
        initiator: sigHash,
      },
      body: args.body,
    });

    console.log('Tx:', tx.asObject());

    let hash = Buffer.from(await tx.hash());
    console.log('TxHash:', hash.toString('hex'));

    let message = joinBuffers([Buffer.from(sigHash), Buffer.from(hash)]);
    console.log('SigMdHash+TxHash:', Buffer.from(message).toString('hex'));

    let messageHash = Buffer.from(await sha256(message));

    console.log('Hash(SigMdHash+TxHash):', messageHash.toString('hex'));

    let signature = await signWeb3(web3.utils.bytesToHex(messageHash));

    if (signature) {
      console.log('Signature from MetaMask:', signature);

      let signatureDER = await rsvSigToDER(signature);

      console.log('Signature DER:', Buffer.from(signatureDER).toString('hex'));

      sig.signature = signatureDER;
      sig.transactionHash = hash;

      let envelope = new Envelope({
        signatures: [sig],
        transaction: [tx],
      });

      console.log('Envelope:', envelope);

      const r = await api.submit(envelope);
      console.log(r);
    }
  };

  const signWeb3 = async (message, personal = false) => {
    setSignWeb3Error(null);
    try {
      if (Ethereum.isMetaMask && personal) {
        return await Ethereum.request({
          method: 'personal_sign',
          params: [message, account],
        });
      }

      return await web3.eth.sign(message, account);
    } catch (error) {
      // Extract the Ledger error
      if (error.message.startsWith('Ledger device: ')) {
        const i = error.message.indexOf('\n');
        try {
          const { originalError } = JSON.parse(error.message.substring(i + 1));
          if (originalError) error = originalError;
        } catch (_) {}
      }

      // Parse the status code
      if ('statusCode' in error) {
        // eslint-disable-next-line default-case
        switch (error.statusCode) {
          case 0x6d02:
          case 0x6511:
            error = new Error('Ledger: the Accumulate app is not running');
            break;
          case 0x530c:
          case 0x6b0c:
          case 0x5515:
            error = new Error('Ledger: device is locked');
            break;
        }
      }

      notification.error({ message: `${error}` });
      setSignWeb3Error(`${error}`);
      return;
    }
  };

  useAsyncEffect(
    async (mounted) => {
      if (account) {
        setFormAddCreditsLiteTA(null);
        setFormAddCreditsDestination(null);
        setLiteTokenAccount(null);
        setLiteTokenAccountError(null);
        setPublicKey(null);

        const liteIdentity = await ethToAccumulate(account);
        query(liteIdentity, setLiteIdentity, setLiteIdentityError);
        loadPublicKey(account);
        setAccAccount(liteIdentity);

        const entries = [];
        const backupLDA = await deriveBackupLDA(await ethToUniversal(account));
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
    let connected = localStorage.getItem('connected');
    if (connected !== null) {
      setWeb3(new Web3(Ethereum));
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
                <Button shape="round" type="primary" onClick={toggleDashboard}>
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
                  <TabsPane
                    tab={
                      <span>
                        <IconContext.Provider
                          value={{ className: 'react-icons' }}
                        >
                          <RiAccountCircleLine />
                        </IconContext.Provider>
                        Account
                      </span>
                    }
                    key="account"
                  >
                    <Title level={5}>
                      Accumulate Lite Identity
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title="Accumulate Lite Identity is an account associated with your Ethereum key"
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                    </Title>
                    <Paragraph>
                      {liteIdentity ? (
                        <Link to={'/acc/' + accAccount.replace('acc://', '')}>
                          {accAccount}
                        </Link>
                      ) : (
                        <Text>{accAccount}</Text>
                      )}
                    </Paragraph>
                    <Divider />
                    {liteIdentityError ? (
                      <Alert
                        type="warning"
                        message={
                          <Text>
                            <strong>Lite Identity does not exist yet</strong>
                            <br />
                            To create a lite identity send ACME to{' '}
                            <Text copyable={{ text: `${accAccount}/ACME` }}>
                              <Text mark>{`${accAccount}/ACME`}</Text>
                            </Text>
                            <br />
                            You can also{' '}
                            <a
                              href="https://bridge.accumulatenetwork.io/release"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <strong>
                                bridge WACME
                                <IconContext.Provider
                                  value={{
                                    className: 'react-icons react-icons-end',
                                  }}
                                >
                                  <RiExternalLinkLine />
                                </IconContext.Provider>
                              </strong>
                            </a>{' '}
                            from Ethereum or Arbitrum, using the above address
                            as the destination.
                          </Text>
                        }
                      />
                    ) : (
                      <>
                        {liteIdentity && liteIdentity.data ? (
                          <Paragraph>
                            <Title level={5}>
                              Credit Balance
                              <IconContext.Provider
                                value={{ className: 'react-icons' }}
                              >
                                <Tooltip
                                  overlayClassName="explorer-tooltip"
                                  title="Credits are used to pay for network transactions. You can add credits by converting ACME tokens."
                                >
                                  <RiQuestionLine />
                                </Tooltip>
                              </IconContext.Provider>
                            </Title>
                            {liteIdentity.data.creditBalance
                              ? liteIdentity.data.creditBalance / 100
                              : 0}
                             credits
                            <br />
                            <Button
                              shape="round"
                              type="primary"
                              onClick={() => setIsAddCreditsOpen(true)}
                            >
                              <IconContext.Provider
                                value={{ className: 'react-icons' }}
                              >
                                <RiAddCircleFill />
                              </IconContext.Provider>
                              Add credits
                            </Button>
                          </Paragraph>
                        ) : (
                          <Skeleton paragraph={false} />
                        )}
                      </>
                    )}
                    <Paragraph></Paragraph>
                  </TabsPane>
                  {backupIsSupported() && (
                    <TabsPane
                      tab={
                        <span>
                          <IconContext.Provider
                            value={{ className: 'react-icons' }}
                          >
                            <LuDatabaseBackup />
                          </IconContext.Provider>
                          Backup
                        </span>
                      }
                      key="backup"
                    >
                      <Title level={5}>
                        Backup Account
                        <IconContext.Provider
                          value={{ className: 'react-icons' }}
                        >
                          <Tooltip
                            overlayClassName="explorer-tooltip"
                            title="Backup Account is a lite data account used to backup your settings"
                          >
                            <RiQuestionLine />
                          </Tooltip>
                        </IconContext.Provider>
                      </Title>
                      <Paragraph>
                        {backupLDA ? (
                          <Link to={'/acc/' + backupUrl.replace('acc://', '')}>
                            {backupUrl}
                          </Link>
                        ) : (
                          <Text>{backupUrl}</Text>
                        )}
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
                    </TabsPane>
                  )}
                  <TabsPane
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
                        {publicKey ? publicKey : 'N/A'}
                      </Text>
                    </Paragraph>
                  </TabsPane>
                  <TabsPane
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
                  </TabsPane>
                  <TabsPane
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
                  </TabsPane>
                </Tabs>
              </Col>
            </Row>
          )}
        </div>
      )}

      <Modal
        title="Connect Wallet"
        open={isConnectWalletOpen}
        onCancel={() => setIsConnectWalletOpen(false)}
        footer={false}
      >
        <List>
          <List.Item>
            <Button block shape="round" size="large" onClick={connectWeb3}>
              MetaMask
            </Button>
          </List.Item>
        </List>
        <List>
          <List.Item>
            <Button block shape="round" size="large">
              WalletConnect
            </Button>
          </List.Item>
        </List>
      </Modal>

      <Modal
        title="Add Note"
        open={isAddNoteOpen && account && backupLDA}
        onCancel={() => {
          setIsAddNoteOpen(false);
          setSignWeb3Error(null);
        }}
        footer={false}
      >
        <Form form={formAddNote} layout="vertical" className="modal-form">
          <Form.Item label="Note" className="text-row" name="value">
            <Input />
          </Form.Item>
          <Form.Item>
            <Button
              onClick={handleFormAddNote}
              type="primary"
              shape="round"
              size="large"
              disabled={formAddNote.getFieldValue('value') == ''}
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

      <Modal
        title="Add Credits"
        open={isAddCreditsOpen && account && liteIdentity}
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
              disabled={
                !liteTokenAccount ||
                !formAddCreditsDestination ||
                !formAddCreditsLiteTA ||
                !liteTokenAccount.data ||
                !liteTokenAccount.data.balance ||
                formAddCreditsAmount <= 0 ||
                (formAddCreditsAmount * 100 * Math.pow(10, 8)) /
                  networkStatus.oracle.price >
                  liteTokenAccount.data.balance
                  ? true
                  : false
              }
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
