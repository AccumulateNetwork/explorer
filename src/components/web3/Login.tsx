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
  const [open, setOpen] = useState(false);
  const { activate, deactivate } = useWeb3React();

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
      setOpen(true);
    }
  };

  const disconnect = () => {
    // setDashOpen(false);
    Wallet.disconnect();
    deactivate();
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

      <Login.Modal
        open={open}
        onCancel={() => setOpen(false)}
        onFinish={() => setOpen(false)}
      />
    </>
  );
}

Login.Modal = function ({
  open,
  onFinish,
  onCancel,
}: {
  open: boolean;
  onFinish(): any;
  onCancel(): any;
}) {
  const history = useHistory();
  const { activate, deactivate } = useWeb3React();
  const [request, setRequest] = useState<Sign.WaitForRequest<Uint8Array>>();
  const [pending, setPending] = useState(false);

  const connect = async () => {
    if (!Ethereum) {
      message.warning('Web3 browser extension not found');
    }

    try {
      setPending(true);
      Wallet.connect('Web3');
      activate(Wallet.connector);

      if (!Ethereum.selectedAddress) {
        onCancel();
        return;
      }
      if (Settings.getKey(Ethereum.selectedAddress)) {
        onFinish();
        return;
      }

      const [publicKey] =
        (await Sign.waitFor(setRequest, () =>
          Wallet.login(Ethereum.selectedAddress)
            .then((x) => x.publicKey)
            .catch((e) => Promise.reject(isLedgerError(e))),
        )) || [];

      if (publicKey) {
        Settings.putKey(Ethereum.selectedAddress, publicKey);
        onFinish();
        history.push('/web3');
      } else {
        deactivate();
        Wallet.disconnect();
        onCancel();
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Sign.WaitFor title="Login" closeWhenDone request={request} />

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
              loading={pending}
              onClick={connect}
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
    </>
  );
};
