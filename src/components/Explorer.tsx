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
import React, { useContext, useEffect, useState } from 'react';
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

import Logo from './common/Logo';
import MinorBlocks from './common/MinorBlocks';
import ScrollToTop from './common/ScrollToTop';
import { SearchForm } from './common/SearchForm';
import { Shared } from './common/Shared';
import { Version } from './common/Version';
import networks from './common/networks';
import { Acc } from './explorer/Acc';
import Block from './explorer/Block';
import Blocks from './explorer/Blocks';
import { Data } from './explorer/Data';
import Error404 from './explorer/Error404';
import Faucet from './explorer/Faucet';
import Favourites from './explorer/Favourites';
import Network from './explorer/Network';
import Settings from './explorer/Settings';
import Staking from './explorer/Staking';
import Tokens from './explorer/Tokens';
import Validators from './explorer/Validators';
import Web3Module from './web3/Web3Module';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

export default function Explorer() {
  const onApiError = (error) => {
    console.error(error);
    message.error('API call failed');
  };
  const [shared, setShared] = useState(new Shared.Context(onApiError));

  const [currentMenu, setCurrentMenu] = useState<any>([
    window.location.pathname,
  ]);
  const [web3ModuleData, setWeb3ModuleData] = useState(null);

  let searchDidLoad;

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
      {Object.values(networks).map((item) => (
        <Menu.Item key={item.label}>
          {shared.canChangeNetwork ? (
            <a
              onClick={() => {
                setShared(new Shared.Context(onApiError, item));
              }}
            >
              <Badge status="success" text={item.label} />
            </a>
          ) : (
            <a target="_blank" rel="noopener noreferrer" href={item.explorer}>
              <Badge status="success" text={item.label} />
            </a>
          )}
        </Menu.Item>
      ))}
    </Menu>
  );

  useEffect(() => {
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

  return (
    <Shared.Provider value={shared}>
      <Router>
        <ScrollToTop />
        <Layout>
          <Header className={shared.network.mainnet ? '' : 'testnet'}>
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

              {shared.network.mainnet && (
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
              </Menu.SubMenu>
            </Menu>

            <Dropdown
              overlay={ExplorerSelect}
              trigger={['click']}
              className="network-badge"
            >
              <Button ghost>
                <Badge status="success" text={shared.network.label} />
                <DownOutlined />
              </Button>
            </Dropdown>
          </Header>

          {false && !shared.network.mainnet && (
            <Header className="web3">
              <Web3Module data={web3ModuleData} />
            </Header>
          )}

          <Content>
            <SearchForm searching={(x) => (searchDidLoad = x)} />
            <Switch>
              <Route exact path="/" component={Blocks} />
              <Route path="/validators" children={<Validators />} />
              <Route path="/tokens" children={<Tokens />} />
              <Route path="/staking" children={<Staking />} />
              <Route path="/favourites" children={<Favourites />} />
              <Route path="/blocks" children={<MinorBlocks />} />
              <Route path="/network" children={<Network />} />
              <Route path="/settings" children={<Settings />} />

              {!shared.network.mainnet && (
                <Route exact path="/faucet" component={Faucet} />
              )}

              <Route path="/acc/:url+">
                <Acc
                  didLoad={(x) => searchDidLoad?.(x)}
                  parentCallback={handleWeb3ModuleData}
                />
              </Route>

              <Route path="/tx/:hash">
                <Acc didLoad={(x) => searchDidLoad?.(x)} />
              </Route>

              <Route path="/data/:url+" children={<Data />} />
              <Route path="/block/:index" children={<Block />} />

              <Route children={<Error404 />} />
            </Switch>
          </Content>

          <Footer>
            <p>&copy; Accumulate Network Explorer</p>
            <p>
              <Version />
            </p>
            <p>
              <Text type="secondary">{shared.network.api[0]}</Text>
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
