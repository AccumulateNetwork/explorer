import { LogoutOutlined } from '@ant-design/icons';
import { useWeb3React } from '@web3-react/core';
import { Button, List, Modal, Tooltip, message } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaWallet } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';

import { tooltip } from '../../utils/lang';
import { useShared } from '../common/Shared';
import { Sign } from '../form/Sign';
import { Settings } from './Settings';
import { Wallet } from './Wallet';
import { Ethereum, isLedgerError } from './utils';

export function Login() {
  const history = useHistory();
  const [connected] = useShared(Settings, 'connected');
  const [connectOpen, setConnectOpen] = useState(false);
  const { activate, deactivate } = useWeb3React();
  const [request, setRequest] = useState<Sign.WaitForRequest<Uint8Array>>();

  // First load
  useEffect(() => {
    if (Wallet.connected) {
      activate(Wallet.connector);
    }
  }, []);

  const onClickWallet = () => {
    if (connected) {
      history.push('/web3');
    } else {
      setConnectOpen(true);
    }
  };

  const disconnect = () => {
    // setDashOpen(false);
    Wallet.disconnect();
    deactivate();
  };

  const connect = async () => {
    if (!Ethereum) {
      message.warning('Web3 browser extension not found');
    }

    setConnectOpen(false);
    Wallet.connect('Web3');
    activate(Wallet.connector);

    if (!Ethereum.selectedAddress) {
      return;
    }
    if (Settings.getKey(Ethereum.selectedAddress)) {
      return;
    }

    const [publicKey] =
      (await Sign.waitFor(setRequest, () =>
        Wallet.login(Ethereum.selectedAddress).catch((e) =>
          Promise.reject(isLedgerError(e)),
        ),
      )) || [];

    if (publicKey) {
      Settings.putKey(Ethereum.selectedAddress, publicKey);
      history.push('/web3');
    } else {
      deactivate();
      Wallet.disconnect();
    }
  };

  return (
    <>
      {connected && (
        <Tooltip
          overlayClassName="explorer-tooltip"
          title={tooltip.web3.disconnect}
        >
          <Button
            className="web3-logout-button"
            icon={<LogoutOutlined />}
            type="ghost"
            shape="circle"
            style={{ marginRight: '0.5em' }}
            onClick={disconnect}
          />
        </Tooltip>
      )}

      <Tooltip
        overlayClassName="explorer-tooltip"
        title={connected ? tooltip.web3.openDashboard : tooltip.web3.connect}
      >
        <Button
          shape="circle"
          type={connected ? 'primary' : 'default'}
          onClick={onClickWallet}
          style={{ marginRight: '1em' }}
          icon={
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <FaWallet style={{ top: -2, position: 'relative' }} />
            </IconContext.Provider>
          }
        />
      </Tooltip>

      {/* Modals */}
      <Sign.WaitFor title="Login" closeWhenDone request={request} />

      <Login.Connect
        open={connectOpen}
        onCancel={() => setConnectOpen(false)}
        onSubmit={connect}
      />
    </>
  );
}

Login.Connect = function ({
  open,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  onSubmit(): any;
  onCancel(): any;
}) {
  return (
    <Modal
      title="Connect Wallet"
      open={open}
      onCancel={onCancel}
      footer={false}
    >
      <List>
        <List.Item>
          <Button
            block
            shape="round"
            size="large"
            onClick={onSubmit}
            disabled={!Ethereum}
            children="MetaMask"
          />
        </List.Item>
      </List>
      <List>
        <List.Item>
          <Button block shape="round" size="large" disabled>
            WalletConnect
          </Button>
        </List.Item>
      </List>
    </Modal>
  );
};
