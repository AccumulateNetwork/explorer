import { LogoutOutlined } from '@ant-design/icons';
import { useWeb3React } from '@web3-react/core';
import { Button, Tooltip, message } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaWallet } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';

import { tooltip } from '../../utils/lang';
import { useShared } from '../common/Shared';
import { Connect } from './Connect';
import { Settings } from './Settings';
import { Wallet } from './Wallet';
import { Ethereum } from './utils';

export function Login() {
  const history = useHistory();
  const [connected] = useShared(Settings, 'connected');
  const [connectOpen, setConnectOpen] = useState(false);
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
      setConnectOpen(true);
    }
  };

  const disconnect = () => {
    // setDashOpen(false);
    Wallet.disconnect();
    deactivate();
  };

  const connect = () => {
    if (!Ethereum) {
      message.warning('Web3 browser extension not found');
    }

    Wallet.connect('Web3');
    activate(Wallet.connector);
    setConnectOpen(false);
    history.push('/web3');
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
        title={connected ? tooltip.web3.toggleDashboard : tooltip.web3.connect}
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

      <Connect
        open={connectOpen}
        onCancel={() => setConnectOpen(false)}
        onSubmit={connect}
      />
    </>
  );
}
