/* eslint-disable no-ex-assign */
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import {
  Badge,
  Button,
  Col,
  Row,
  Tabs,
  Tooltip,
  Typography,
  notification,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiInformationLine,
  RiKey2Line,
  RiListCheck,
  RiPenNibLine,
  RiQuestionLine,
  RiShutDownLine,
  RiStackLine,
  RiUserLine,
} from 'react-icons/ri';

import { Buffer } from 'accumulate.js/lib/common';

import { ethToAccumulate, truncateAddress } from '../../utils/web3';
import { useShared } from '../common/Shared';
import { useAsyncEffect } from '../common/useAsync';
import { Settings } from './Settings';
import { Wallet } from './Wallet';
import { ethAddress, isLedgerError } from './utils';

const { Title, Paragraph, Text } = Typography;

export default function Component() {
  const [isDashboardOpen, setIsDashboardOpen] = useShared(
    Settings,
    'dashboardOpen',
  );

  const [publicKey, setPublicKey] = useState<Uint8Array>(null);

  const { account, activate, deactivate } = useWeb3React();

  const injected = new InjectedConnector({});

  const disconnect = async () => {
    Settings.connected = null;
    deactivate();
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

  const checkSignError = async (promise) => {
    try {
      return await promise;
    } catch (error) {
      error = isLedgerError(error);
      if ('message' in error) {
        error = error.message;
      }
      notification.error({ message: `${error}` });
    }
  };

  useAsyncEffect(
    async (mounted) => {
      if (account) {
        setPublicKey(null);

        const liteIdentity = await ethToAccumulate(account);
        if (!mounted()) return;
        loadPublicKey(account);
      }
    },
    [account],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (Wallet.connected) {
      activate(injected);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`web3-module ${account ? 'connected' : null}`}>
      {account && (
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
    </div>
  );
}
