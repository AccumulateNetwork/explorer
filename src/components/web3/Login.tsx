import { LogoutOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { Button, Dropdown } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { FaWallet } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';

import { useWeb3 } from './Context';

export default Login;

export function Login() {
  const history = useHistory();
  const web3 = useWeb3();

  const Icon = () => (
    <IconContext.Provider value={{ className: 'react-icons' }}>
      <FaWallet style={{ top: -2, position: 'relative' }} />
    </IconContext.Provider>
  );

  if (!web3.connected) {
    return (
      <Button
        shape="circle"
        type="default"
        onClick={() => web3.connect().then(() => history.push('/web3'))}
        style={{ marginRight: '1em' }}
        icon={<Icon />}
      />
    );
  }

  return (
    <>
      <Dropdown
        placement="bottomCenter"
        menu={{
          items: [
            {
              label: 'Switch account',
              key: 'switch',
              onClick: () => web3.switch(),
              icon: <UserSwitchOutlined />,
            },
            {
              label: 'Disconnect',
              key: 'disconnect',
              onClick: () => web3.disconnect(),
              icon: <LogoutOutlined />,
            },
          ],
        }}
      >
        <Button
          shape="circle"
          type="primary"
          style={{ marginRight: '1em' }}
          onClick={() => history.push('/web3')}
          icon={<Icon />}
        />
      </Dropdown>
    </>
  );
}
