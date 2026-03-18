import {
  BarsOutlined,
  DownOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Menu, MenuProps, Space } from 'antd';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext, IconType } from 'react-icons';
import {
  RiCoinLine,
  RiComputerLine,
  RiDashboardLine,
  RiMoonLine,
  RiPercentLine,
  RiShieldCheckLine,
  RiStarLine,
  RiSunLine,
} from 'react-icons/ri';
import { useHistory } from 'react-router-dom';
import { Link } from 'react-router-dom';

import Logo from '../common/Logo';
import { Network } from '../common/Network';
import networks, { NetworkConfig } from '../common/networks';
import { useShared } from '../common/Shared';
import { useWeb3 } from '../web3/Context';
import { Login } from '../web3/Login';
import { Settings } from './Settings';
import { applyTheme } from '../../theme';

export function MainMenu({
  onSelectNetwork,
}: {
  onSelectNetwork(_: NetworkConfig);
}) {
  const shared = useContext(Network);

  const [isWide, setIsWide] = useState(window.innerWidth > 750);
  addEventListener('resize', () => setIsWide(window.innerWidth > 750));

  const history = useHistory();
  const web3 = useWeb3();
  const [currentMenu, setCurrentMenu] = useState<any>([
    window.location.pathname,
  ]);
  const [theme, setTheme] = useShared(Settings, 'theme');

  const Icon = ({ icon: IconComponent }: { icon: IconType }) => (
    <IconContext.Provider
      value={{ className: 'react-icons' }}
      children={<IconComponent />}
    />
  );

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const themeIcon =
    theme === 'light' ? RiSunLine : theme === 'dark' ? RiMoonLine : RiComputerLine;

  const themeMenuItems: MenuProps['items'] = [
    {
      key: 'light',
      label: 'Light',
      icon: <Icon icon={RiSunLine} />,
      onClick: () => handleThemeChange('light'),
    },
    {
      key: 'dark',
      label: 'Dark',
      icon: <Icon icon={RiMoonLine} />,
      onClick: () => handleThemeChange('dark'),
    },
    {
      key: 'system',
      label: 'System',
      icon: <Icon icon={RiComputerLine} />,
      onClick: () => handleThemeChange('system'),
    },
  ];

  const handleMenuClick = (e) => {
    if (e.key === 'logo') {
      setCurrentMenu('/blocks');
    } else {
      setCurrentMenu([e.key]);
    }
  };

  useEffect(() => {
    setCurrentMenu(window.location.pathname);
    if (window.location.pathname.includes('blocks')) {
      setCurrentMenu('/blocks');
    }

    if (window.location.pathname.includes('tokens')) {
      setCurrentMenu('/tokens');
    }

    if (window.location.pathname.includes('staking')) {
      setCurrentMenu('/staking');
    }

    if (window.location.pathname.includes('validators')) {
      setCurrentMenu('/validators');
    }
  }, []);

  const networkMenuItems: MenuProps['items'][0][] = shared.canChangeNetwork
    ? Object.values(networks).map((item) => ({
        key: item.label,
        label: (
          <a onClick={() => onSelectNetwork(item)}>
            <Network.Status network={item} text={item.label} />
          </a>
        ),
      }))
    : Object.values(networks)
        .filter((item) => item.explorer)
        .map((item) => ({
          key: item.label,
          label: (
            <a target="_blank" rel="noopener noreferrer" href={item.explorer}>
              <Network.Status network={item} text={item.label} />
            </a>
          ),
        }));

  const items: MenuProps['items'] = [
    isWide && {
      key: 'home',
      label: (
        <Link to="/">
          <Logo />
        </Link>
      ),
    },
    !isWide &&
      web3.canConnect &&
      (web3.connected
        ? {
            key: 'web3',
            label: 'Wallet',
            children: [
              {
                label: 'Open dashboard',
                key: 'dashboard',
                onClick: () => history.push('/wallet'),
                icon: <BarsOutlined />,
              },
              {
                label: 'Disconnect',
                key: 'disconnect',
                onClick: () => web3.disconnect(),
                icon: <LogoutOutlined />,
              },
            ],
          }
        : {
            key: 'web3',
            label: 'Connect Web3 Wallet',
            onClick: () => web3.connect().then(() => history.push('/wallet')),
          }),
    {
      key: 'blocks',
      icon: isWide && <Icon icon={RiDashboardLine} />,
      label: (
        <Link to="/blocks" className="nav-text">
          Blocks
        </Link>
      ),
    },
    shared.network.mainnet && {
      key: 'tokens',
      icon: isWide && <Icon icon={RiCoinLine} />,
      label: <Link to="/tokens" className="nav-text" children="Tokens" />,
    },
    shared.network.mainnet && {
      key: 'staking',
      icon: isWide && <Icon icon={RiPercentLine} />,
      label: <Link to="/staking" className="nav-text" children="Staking" />,
    },
    shared.network.mainnet && {
      key: 'validators',
      icon: isWide && <Icon icon={RiShieldCheckLine} />,
      label: (
        <Link to="/validators" className="nav-text" children="Validators" />
      ),
    },
    {
      key: 'favourites',
      icon: isWide && <Icon icon={RiStarLine} />,
      label: (
        <Link to="/favourites" className="nav-text" children="Favourites" />
      ),
    },
    !isWide && {
      key: 'changeNetwork',
      label: 'Select Network',
      children: networkMenuItems,
    },
    !isWide && {
      key: 'theme',
      label: 'Theme',
      icon: <Icon icon={themeIcon} />,
      children: themeMenuItems,
    },
  ];

  if (isWide) {
    return (
      <>
        <Menu
          theme="dark"
          mode="horizontal"
          onClick={handleMenuClick}
          selectedKeys={currentMenu}
          items={items}
        />
        <div className="menu-right">
          {shared.network.wallet && <Login />}
          <Dropdown
            menu={{ items: themeMenuItems, selectedKeys: [theme] }}
            trigger={['click']}
          >
            <Button
              ghost
              style={{
                marginRight: 8,
                padding: '4px 10px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
              icon={<Icon icon={themeIcon} />}
            />
          </Dropdown>
          <Dropdown
            menu={{ items: networkMenuItems }}
            trigger={['click']}
            className="network-badge"
          >
            <Button ghost>
              <Network.Status
                network={shared.network}
                text={shared.network.label}
              />
              <DownOutlined />
            </Button>
          </Dropdown>
        </div>
      </>
    );
  }

  return (
    <Space.Compact
      block
      direction="horizontal"
      style={{ justifyContent: 'space-between' }}
    >
      <span></span>

      <Link to="/">
        <Logo />
        <span
          className="nav-text"
          style={{
            marginLeft: 15,
            fontSize: '18pt',
            color: 'rgba(255, 255, 255, 0.65)',
          }}
        >
          Accumulate
        </span>
      </Link>

      <Dropdown
        menu={{ items }}
        trigger={['click']}
        overlayStyle={{ minWidth: 250 }}
      >
        <MenuOutlined style={{ color: 'rgba(255, 255, 255, 0.65)' }} />
      </Dropdown>
    </Space.Compact>
  );
}

{
  /* <Menu.SubMenu key="more" title="More" icon={<MoreOutlined />}>
<Menu.Item key="bridge">
  <a
    href={
      shared.network.mainnet
        ? 'https://bridge.accumulatenetwork.io'
        : 'https://testnet.bridge.accumulatenetwork.io'
    }
    target="_blank"
    rel="noopener noreferrer"
  >
    <IconContext.Provider value={{ className: 'react-icons' }}>
      <RiArrowLeftRightLine />
    </IconContext.Provider>
    <span className="nav-text">Bridge</span>
  </a>
</Menu.Item>
<Menu.Item
  key="liquidstaking"
  style={!shared.network.mainnet ? { display: 'none' } : null}
>
  <a
    href="https://accumulated.finance"
    target="_blank"
    rel="noopener noreferrer"
  >
    <IconContext.Provider value={{ className: 'react-icons' }}>
      <RiDropLine />
    </IconContext.Provider>
    <span className="nav-text">Liquid Staking</span>
  </a>
</Menu.Item>
<Menu.Item
  key="wallet"
  style={!shared.network.mainnet ? { display: 'none' } : null}
>
  <a
    href="https://accumulatenetwork.io/wallet"
    target="_blank"
    rel="noopener noreferrer"
  >
    <IconContext.Provider value={{ className: 'react-icons' }}>
      <RiWalletLine />
    </IconContext.Provider>
    <span className="nav-text">Mobile Wallet</span>
  </a>
</Menu.Item>
<Menu.Item key="settings">
  <Link to="/settings">
    <IconContext.Provider value={{ className: 'react-icons' }}>
      <RiSettingsLine />
    </IconContext.Provider>
    <span className="nav-text">Settings</span>
  </Link>
</Menu.Item>
</Menu.SubMenu> */
}
