import { DownOutlined, MenuOutlined } from '@ant-design/icons';
import { Badge, Button, Dropdown, Menu, MenuProps, Space } from 'antd';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext, IconType } from 'react-icons';
import {
  RiCoinLine,
  RiDashboardLine,
  RiPercentLine,
  RiShieldCheckLine,
  RiStarLine,
} from 'react-icons/ri';
import { useHistory } from 'react-router-dom';
import { Link } from 'react-router-dom';

import Logo from '../common/Logo';
import { Shared } from '../common/Network';
import { useShared } from '../common/Shared';
import networks, { Network } from '../common/networks';
import { Login, Login as Web3Login } from '../web3/Login';
import { Settings } from '../web3/Settings';
import { Wallet } from '../web3/Wallet';

export function MainMenu({ onSelectNetwork }: { onSelectNetwork(_: Network) }) {
  const shared = useContext(Shared);

  const [isWide, setIsWide] = useState(window.innerWidth > 750);
  addEventListener('resize', () => setIsWide(window.innerWidth > 750));

  const history = useHistory();
  const [web3Connected] = useShared(Settings, 'connected');
  const [loginOpen, setLoginOpen] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<any>([
    window.location.pathname,
  ]);

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

  const networkMenuItems = Object.values(networks).map(
    (item) =>
      ({
        key: item.label,
        label: shared.canChangeNetwork ? (
          <a onClick={() => onSelectNetwork(item)}>
            <Badge status="success" text={item.label} />
          </a>
        ) : (
          <a target="_blank" rel="noopener noreferrer" href={item.explorer}>
            <Badge status="success" text={item.label} />
          </a>
        ),
      }) as MenuProps['items'][0],
  );

  const Icon = ({ icon: Icon }: { icon: IconType }) => (
    <IconContext.Provider
      value={{ className: 'react-icons' }}
      children={<Icon />}
    />
  );

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
      Wallet.canConnect && {
        key: 'web3',
        label: `${Wallet.connected ? '' : 'Connect '}Web3 Wallet`,
        onClick: () => {
          if (web3Connected) {
            history.push('/web3');
          } else {
            setLoginOpen(true);
          }
        },
      },
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
          {!shared.network.mainnet && <Web3Login />}
          <Dropdown
            menu={{ items: networkMenuItems }}
            trigger={['click']}
            className="network-badge"
          >
            <Button ghost>
              <Badge status="success" text={shared.network.label} />
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

      {/* Modals */}
      <Login.Modal
        open={loginOpen}
        onCancel={() => setLoginOpen(false)}
        onFinish={() => setLoginOpen(false)}
      />
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
