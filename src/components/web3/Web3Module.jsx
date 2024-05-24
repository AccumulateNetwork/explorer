/* eslint-disable no-ex-assign */
import React, { useState, useEffect } from 'react';
import { Envelope } from 'accumulate.js/lib/messaging';
import { Buffer, sha256 } from 'accumulate.js/lib/common';

import { Link } from 'react-router-dom';

import {
  Button,
  Modal,
  List,
  message,
  Typography,
  Badge,
  Row,
  Col,
  Tag,
  Tabs,
  Tooltip,
  Alert,
  Skeleton,
  Divider,
  Form,
  Select,
  InputNumber,
  notification,
} from 'antd';

import Web3 from 'web3';

import EthCrypto from 'eth-crypto';

import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';

import { IconContext } from 'react-icons';
import {
  RiInformationLine,
  RiAccountCircleLine,
  RiShutDownLine,
  RiQuestionLine,
  RiUserLine,
  RiKey2Line,
  RiListCheck,
  RiStackLine,
  RiAddCircleFill,
  RiExternalLinkLine,
  RiPenNibLine,
} from 'react-icons/ri';

import RPC from '../common/RPC';
import {
  ethToAccumulate,
  truncateAddress,
  txHash,
  sigMdHash,
  joinBuffers,
  rsvSigToDER,
} from '../common/Web3';
import { AddCredits, SignatureArgs } from 'accumulate.js/lib/core';

const { Title, Paragraph, Text } = Typography;

const Web3Module = (props) => {
  const [isConnectWalletOpen, setIsConnectWalletOpen] = useState(false);
  const [isAddCreditsOpen, setIsAddCreditsOpen] = useState(false);

  const [isDashboardOpen, setIsDashboardOpen] = useState(
    localStorage.getItem('isDashboardOpen') ? true : false,
  );

  const [ACME, setACME] = useState(null);
  const [ACMEError, setACMEError] = useState(null);

  const [liteIdentity, setLiteIdentity] = useState(null);
  const [liteIdentityError, setLiteIdentityError] = useState(null);

  const [publicKey, setPublicKey] = useState(null);

  const [formAddCredits] = Form.useForm();
  const [formAddCreditsLiteTA, setFormAddCreditsLiteTA] = useState(null);
  const [formAddCreditsDestination, setFormAddCreditsDestination] =
    useState(null);
  const [formAddCreditsAmount, setFormAddCreditsAmount] = useState(null);

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
    if (window.ethereum) {
      setWeb3(new Web3(window.ethereum));
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
      let params = { url: url };
      const response = await RPC.request('query', params);
      if (response && response.data) {
        setResult(response);
      } else {
        throw new Error(url + ' not found');
      }
    } catch (error) {
      setResult(null);
      setError(`${error}`);
    }
  };

  const getNetworkStatus = async () => {
    setNetworkStatus(null);
    setNetworkStatusError(null);
    try {
      let params = { partition: 'directory' };
      const response = await RPC.request('network-status', params, 'v3');
      if (response && response.oracle && response.oracle.price) {
        setNetworkStatus(response);
      } else {
        throw new Error('can not get network status');
      }
    } catch (error) {
      setNetworkStatus(null);
      setNetworkStatusError(`${error}`);
    }
  };

  // loadPublicKey loads ethereum public key from local storage
  const loadPublicKey = async (account) => {
    let pub = localStorage.getItem(account);

    // need more complex check here
    if (pub && EthCrypto.publicKey.toAddress(pub) === account) {
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

    let message = web3.utils.padRight(account, 64);
    let signature = await signWeb3(message);
    if (!signature) return;

    console.log('Message:', message);
    console.log('Signature:', signature);

    let pub = EthCrypto.recoverPublicKey(signature, message);
    console.log('Public key:', pub);
    if (EthCrypto.publicKey.toAddress(pub) !== account) {
      notification.error({ message: 'Failed to recover public key' });
      return;
    }

    setPublicKey(pub);
    localStorage.setItem(account, pub);
    setIsDashboardOpen(true);
  };

  const handleFormAddCredits = async () => {
    let upk = '04' + publicKey;

    let sig = {
      type: 'eth',
      signer: formAddCreditsLiteTA,
      signerVersion: 1,
      timestamp: Date.now(),
      publicKey: upk,
    };

    console.log('Signature:', sig);

    let sigHash = await sigMdHash(sig);
    console.log('SigMdHash:', sigHash.toString('hex'));

    let tx = {
      header: {
        principal: formAddCreditsLiteTA,
        initiator: sigHash.toString('hex'),
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
    };

    console.log('Tx:', tx);

    let hash = await txHash(tx);
    console.log('TxHash:', hash.toString('hex'));

    let message = joinBuffers([Buffer.from(sigHash), Buffer.from(hash)]);
    console.log('SigMdHash+TxHash:', Buffer.from(message).toString('hex'));

    let messageHash = Buffer.from(await sha256(message));

    console.log('Hash(SigMdHash+TxHash):', messageHash.toString('hex'));

    let signature = await signWeb3(web3.utils.bytesToHex(messageHash));

    if (signature) {
      console.log('Signature from MetaMask:', signature);

      let signatureDER = await rsvSigToDER(signature);

      console.log('Signature DER:', signatureDER.toString('hex'));

      sig.signature = signatureDER.toString('hex');
      sig.transactionHash = hash.toString('hex');
      sig.publicKey = upk;

      let envelope = new Envelope({
        signatures: [sig],
        transaction: [
          {
            header: tx.header,
            body: new AddCredits(tx.body),
          },
        ],
      });

      setIsAddCreditsOpen(false);
      console.log('Envelope:', envelope);

      const response = await RPC.request(
        'submit',
        { envelope: envelope.asObject() },
        'v3',
      );
      console.log(response);
    }
  };

  const signWeb3 = async (message) => {
    setSignWeb3Error(null);
    try {
      let sig = await web3.eth.sign(message, account);
      return sig;
    } catch (error) {
      // Extract the Ledger error
      const message = `${error}`;
      if (message.startsWith('Ledger device: ')) {
        const i = message.indexOf('\n');
        try {
          const { originalError } = JSON.parse(message.substring(i + 1));
          if (originalError) error = originalError;
        } catch (_) {}
      }

      // Parse the status code
      if (error && typeof error === 'object' && 'statusCode' in error) {
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

      notification.error({ message });
      setSignWeb3Error(message);
      return;
    }
  };

  useEffect(async () => {
    if (account) {
      setFormAddCreditsLiteTA(null);
      setFormAddCreditsDestination(null);
      setLiteTokenAccount(null);
      setLiteTokenAccountError(null);
      setPublicKey(null);

      let liteIdentity = await ethToAccumulate(account);
      query(liteIdentity, setLiteIdentity, setLiteIdentityError);
      loadPublicKey(account);
      setAccAccount(liteIdentity);
    }
  }, [account]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getNetworkStatus();
    query('ACME', setACME, setACMEError);
    let connected = localStorage.getItem('connected');
    if (connected !== null) {
      setWeb3(new Web3(window.ethereum));
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
                  <Tabs.Pane
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
                  </Tabs.Pane>
                  <Tabs.Pane
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
                  </Tabs.Pane>
                  <Tabs.Pane
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
                  </Tabs.Pane>
                  <Tabs.Pane
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
                  </Tabs.Pane>
                </Tabs>
              </Col>
            </Row>
          )}
          {false ? (
            <Row>
              <Col>
                {props.data && props.data.data ? (
                  <>
                    {props.data.data.type ? (
                      <Tag>{props.data.data.type}</Tag>
                    ) : null}
                  </>
                ) : null}
              </Col>
            </Row>
          ) : null}
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
};

export default Web3Module;
