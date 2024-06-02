import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { Button, Tooltip, message } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaWallet } from 'react-icons/fa';
import { RiQuestionLine } from 'react-icons/ri';
import { connect } from 'rxjs';

import Tooltips from '../../utils/lang';
import { useShared } from '../common/Shared';
import { Connect } from './Connect';
import { Settings } from './Settings';
import { Wallet } from './Wallet';
import { Ethereum, truncateAddress } from './utils';

export function Login() {
  const [dashOpen, setDashOpen] = useShared(Settings, 'dashboardOpen');
  const [connected] = useShared(Settings, 'connected');
  const [connectOpen, setConnectOpen] = useState(false);
  const { account, activate } = useWeb3React();

  // First load
  const injected = new InjectedConnector({});
  useEffect(() => {
    if (Wallet.connected) {
      activate(injected);
    }
  }, []);

  const onClick = () => {
    if (connected) {
      setDashOpen(!dashOpen);
    } else {
      setConnectOpen(true);
    }
  };

  const connect = () => {
    if (!Ethereum) {
      message.warning('Web3 browser extension not found');
    }

    Wallet.connectWeb3();
    activate(injected);
    setConnectOpen(false);
    setDashOpen(true);
  };

  return (
    <>
      <Tooltip
        overlayClassName="explorer-tooltip"
        title={connected ? truncateAddress(account) : Tooltips.web3.connect}
      >
        <Button
          shape="circle"
          type={connected ? 'primary' : 'default'}
          onClick={onClick}
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
