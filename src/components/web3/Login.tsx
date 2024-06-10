import { LogoutOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { FaWallet } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';

import { tooltip } from '../../utils/lang';
import { useWeb3 } from './Connect';

export function Login() {
  const history = useHistory();
  const web3 = useWeb3();

  const onClickWallet = async () => {
    if (web3.connected) {
      history.push('/web3');
    } else {
      web3.connect().then(() => history.push('/web3'));
    }
  };

  return (
    <>
      {web3.connected && (
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
            onClick={() => web3.disconnect()}
          />
        </Tooltip>
      )}

      <Tooltip
        overlayClassName="explorer-tooltip"
        title={
          web3.connected ? tooltip.web3.openDashboard : tooltip.web3.connect
        }
      >
        <Button
          shape="circle"
          type={web3.connected ? 'primary' : 'default'}
          onClick={onClickWallet}
          style={{ marginRight: '1em' }}
          icon={
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <FaWallet style={{ top: -2, position: 'relative' }} />
            </IconContext.Provider>
          }
        />
      </Tooltip>
    </>
  );
}
