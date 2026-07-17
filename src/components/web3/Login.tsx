import { LogoutOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { Button, Dropdown } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { FaWallet } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

import { useWeb3 } from './Context';

export default Login;

export function Login() {
  const navigate = useNavigate();
  const web3 = useWeb3();

  const Icon = () => (
    <IconContext.Provider value={{ className: 'react-icons' }}>
      <FaWallet style={{ top: -2, position: 'relative' }} />
    </IconContext.Provider>
  );

  const goToWallet = () =>
    navigate(
      `/acc/${web3.liteIdentity.url.toString().replace(/^acc:\/\//, '')}`,
    );

  if (!web3.connected) {
    return (
      <Button
        shape="circle"
        ghost
        onClick={() => web3.connect().then((ok) => ok && goToWallet())}
        style={{ marginRight: '1em' }}
        icon={<Icon />}
      />
    );
  }

  return (
    <>
      <Dropdown
        placement="bottom"
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
          onClick={goToWallet}
          icon={<Icon />}
        />
      </Dropdown>
    </>
  );
}
