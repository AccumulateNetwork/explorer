import { DownOutlined, MoreOutlined } from '@ant-design/icons';
import {
  Badge,
  Button,
  Dropdown,
  Layout,
  Menu,
  Typography,
  message,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiArrowLeftRightLine,
  RiCoinLine,
  RiDashboardLine,
  RiDropLine,
  RiPercentLine,
  RiSettingsLine,
  RiShieldCheckLine,
  RiStarLine,
  RiWalletLine,
} from 'react-icons/ri';
import { Link, Route, BrowserRouter as Router, Switch } from 'react-router-dom';

import { JsonRpcClient } from 'accumulate.js/lib/api_v3';

import Logo from './common/Logo';
import MinorBlocks from './common/MinorBlocks';
import networks from './common/Networks.json';
import ScrollToTop from './common/ScrollToTop';
import SearchForm from './common/SearchForm';
import { Shared } from './common/Shared';
import { Version } from './common/Version';
import { Acc } from './explorer/Acc';
import Block from './explorer/Block';
import Blocks from './explorer/Blocks';
import Error404 from './explorer/Error404';
import Faucet from './explorer/Faucet';
import Favourites from './explorer/Favourites';
import Network from './explorer/Network';
import page from './explorer/Settings';
import Staking from './explorer/Staking';
import Tokens from './explorer/Tokens';
import Validators from './explorer/Validators';
import { DataEntry } from './message/DataEntry';
import Web3Module from './web3/Web3Module';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

export default function Explorer() {
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [currentMenu, setCurrentMenu] = useState<any>([
    window.location.pathname,
  ]);
  const [isMainnet, setIsMainnet] = useState(false);
  const [web3ModuleData, setWeb3ModuleData] = useState(null);

  const handleMenuClick = (e) => {
    if (e.key === 'logo') {
      setCurrentMenu('/blocks');
    } else {
      setCurrentMenu([e.key]);
    }
  };

  const handleWeb3ModuleData = (e) => {
    setWeb3ModuleData(e);
  };

  const ExplorerSelect = (
    <Menu>
      {networks.map((item) => (
        <Menu.Item key={item.name}>
          <a target="_blank" rel="noopener noreferrer" href={item.url}>
            <Badge status="success" text={item.name} />
          </a>
        </Menu.Item>
      ))}
    </Menu>
  );

  useEffect(() => {
    if (import.meta.env.VITE_APP_API_PATH) {
      const matchedNetwork = networks.find((network) =>
        network.api.includes(import.meta.env.VITE_APP_API_PATH),
      );

      setCurrentNetwork(matchedNetwork?.name || 'Unknown');
      setIsMainnet(matchedNetwork?.mainnet || false);
    } else {
      setCurrentNetwork('Unknown');
    }

    if (
      window.location.pathname === '/' ||
      window.location.pathname.includes('blocks')
    ) {
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

  const sharedCtx = new Shared.Context({
    network: import.meta.env.VITE_APP_API_PATH,
    onApiError(error) {
      console.error(error);
      message.error('API call failed');
    },
  });
  return (
    <Shared.Provider value={sharedCtx}>
      <Router>
        <ScrollToTop />
        <Layout>
          <Header>
            <Menu
              theme="dark"
              mode="horizontal"
              onClick={handleMenuClick}
              selectedKeys={currentMenu}
            >
              <Menu.Item key="logo">
                <Link to="/">
                  <Logo />
                </Link>
              </Menu.Item>

              <Menu.Item key="/blocks">
                <Link to="/">
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiDashboardLine />
                  </IconContext.Provider>
                  <span className="nav-text">Blocks</span>
                </Link>
              </Menu.Item>

              {isMainnet && (
                <>
                  <Menu.Item key="/tokens">
                    <Link to="/tokens">
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <RiCoinLine />
                      </IconContext.Provider>
                      <span className="nav-text">Tokens</span>
                    </Link>
                  </Menu.Item>
                  <Menu.Item key="/staking">
                    <Link to="/staking">
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <RiPercentLine />
                      </IconContext.Provider>
                      <span className="nav-text">Staking</span>
                    </Link>
                  </Menu.Item>
                  <Menu.Item key="/validators">
                    <Link to="/validators">
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <RiShieldCheckLine />
                      </IconContext.Provider>
                      <span className="nav-text">Validators</span>
                    </Link>
                  </Menu.Item>
                </>
              )}

              <Menu.Item key="/favourites">
                <Link to="/favourites">
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiStarLine />
                  </IconContext.Provider>
                  <span className="nav-text">Favourites</span>
                </Link>
              </Menu.Item>

              <Menu.SubMenu key="more" title="More" icon={<MoreOutlined />}>
                <Menu.Item key="bridge">
                  <a
                    href={
                      isMainnet
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
                  style={!isMainnet ? { display: 'none' } : null}
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
                  style={!isMainnet ? { display: 'none' } : null}
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
              </Menu.SubMenu>
            </Menu>
            {currentNetwork ? (
              <Dropdown
                overlay={ExplorerSelect}
                trigger={['click']}
                className="network-badge"
              >
                <Button ghost>
                  <Badge status="success" text={currentNetwork} />
                  <DownOutlined />
                </Button>
              </Dropdown>
            ) : null}
          </Header>

          {!isMainnet && (
            <Header className="web3">
              <Web3Module data={web3ModuleData} />
            </Header>
          )}

          <Content>
            <SearchForm />
            <Switch>
              <Route exact path="/" component={Blocks} />

              {currentNetwork !== 'Mainnet' && (
                <Route exact path="/faucet" component={Faucet} />
              )}

              <Route
                path="/acc/:url+"
                render={(match) => (
                  <Acc {...match} parentCallback={handleWeb3ModuleData} />
                )}
              />

              <Route
                path="/data/:url+"
                render={(x) => <DataEntry url={x.match.params.url} />}
              />

              <Route path="/tx/:hash" component={Acc} />
              <Route path="/block/:index" component={Block} />

              <Route path="/validators" component={Validators} />
              <Route path="/tokens" component={Tokens} />
              <Route path="/staking" component={Staking} />
              <Route path="/favourites" component={Favourites} />
              <Route path="/blocks" component={MinorBlocks} />
              <Route path="/network" component={Network} />
              <Route path="/settings" component={page} />

              <Route component={Error404} />
            </Switch>
          </Content>

          <Footer>
            <p>&copy; Accumulate Network Explorer</p>
            <p>
              <Version />
            </p>
            <p>
              <Text type="secondary">{sharedCtx.network.api[0]}</Text>
            </p>
            <p>
              <a href="mailto:support@defidevs.io">support@defidevs.io</a>
            </p>
          </Footer>
        </Layout>
      </Router>
    </Shared.Provider>
  );
}
