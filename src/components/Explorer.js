import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Link, Switch } from 'react-router-dom';

import { Layout, Menu, Dropdown, Button, Badge, Typography } from 'antd';

import {
  DownOutlined, MoreOutlined
} from '@ant-design/icons';

import { IconContext } from "react-icons";
import {
  RiDashboardLine, RiWalletLine, RiCoinLine, RiShieldCheckLine, RiArrowLeftRightLine, RiPercentLine, RiDropLine, RiStarLine
} from 'react-icons/ri';

import Logo from './common/Logo';
import Version from './common/Version';
import ScrollToTop from './common/ScrollToTop';
import SearchForm from './common/SearchForm';

import Blocks from './explorer/Blocks';
import Staking from './explorer/Staking';
import Favourites from './explorer/Favourites';
import Acc from './explorer/Acc';
import Tx from './explorer/Tx';
import Error404 from './explorer/Error404';
import Faucet from './explorer/Faucet';
import Validators from './explorer/Validators';
import Tokens from './explorer/Tokens';
import Block from './explorer/Block';

const { Header, Content } = Layout;
const { Text } = Typography;

const Explorer = props => {

  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [currentMenu, setCurrentMenu] = useState([window.location.pathname]);
  const [isMainnet, setIsMainnet] = useState(false);

  const handleMenuClick = e => {
    if (e.key === "logo") {
        setCurrentMenu("/blocks");
    } else {
        setCurrentMenu([e.key]);
    }
  };

  const ExplorerSelect = (
    <Menu>
      <Menu.Item key="Mainnet">
          <a target="_blank" rel="noopener noreferrer" href="https://explorer.accumulatenetwork.io">
              <Badge status="success" text="Mainnet" />
          </a>
      </Menu.Item>
      <Menu.Item key="Testnet">
          <a target="_blank" rel="noopener noreferrer" href="https://testnet.explorer.accumulatenetwork.io">
              <Badge status="success" text="Testnet" />
          </a>
      </Menu.Item>
    </Menu>
  );

  const ExplorerSelectFooter = (
    <Menu>
      <Menu.Item key="Mainnet">
            <a target="_blank" rel="noopener noreferrer" href="https://explorer.accumulatenetwork.io">
                Mainnet
            </a>
      </Menu.Item>
      <Menu.Item key="Testnet">
            <a target="_blank" rel="noopener noreferrer" href="https://testnet.explorer.accumulatenetwork.io">
                Testnet
            </a>
      </Menu.Item>
    </Menu>
  );

  useEffect(() => {

    if (process.env.REACT_APP_API_PATH) {
        setIsMainnet(false);
        switch (process.env.REACT_APP_API_PATH) {
            case 'https://mainnet.accumulatenetwork.io':
            case 'https://api-gateway.accumulate.defidevs.io':
            setCurrentNetwork("Mainnet");
            setIsMainnet(true);
            break;
        case 'https://testnet.accumulatenetwork.io':
            setCurrentNetwork("Testnet");
            break;
        default:
            setCurrentNetwork("Unknown");
            break;
      }
    } else {
      setCurrentNetwork("Unknown");
    }

    if (window.location.pathname === "/" || window.location.pathname.includes("blocks")) {
      setCurrentMenu("/blocks");
    }

    if (window.location.pathname.includes("tokens")) {
      setCurrentMenu("/tokens");
    }

    if (window.location.pathname.includes("staking")) {
      setCurrentMenu("/staking");
    }

    if (window.location.pathname.includes("validators")) {
        setCurrentMenu("/validators");
    }
  
  }, []);

  return (
    <Router>
    <ScrollToTop />
      <Layout>

        <Header style={{ padding: 0, margin: 0 }}>
            <Menu theme="dark" mode="horizontal" onClick={handleMenuClick} selectedKeys={currentMenu}>
                <Menu.Item key="logo">
                    <Link to="/">
                        <Logo />
                    </Link>
                </Menu.Item>

                <Menu.Item key="/blocks">
                    <Link to="/">
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiDashboardLine /></IconContext.Provider>
                        <span className="nav-text">Blocks</span>
                    </Link>
                </Menu.Item>

                {isMainnet &&
                <>
                <Menu.Item key="/tokens">
                    <Link to="/tokens">
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiCoinLine /></IconContext.Provider>
                        <span className="nav-text">Tokens</span>
                    </Link>
                </Menu.Item>
                <Menu.Item key="/staking">
                    <Link to="/staking">
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiPercentLine /></IconContext.Provider>
                        <span className="nav-text">Staking</span>
                    </Link>
                </Menu.Item>
                <Menu.Item key="/validators">
                    <Link to="/validators">
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiShieldCheckLine /></IconContext.Provider>
                        <span className="nav-text">Validators</span>
                    </Link>
                </Menu.Item>
                </>
                }

                <Menu.Item key="/favourites">
                    <Link to="/favourites">
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiStarLine /></IconContext.Provider>
                        <span className="nav-text">Favourites</span>
                    </Link>
                </Menu.Item>

                <Menu.SubMenu key="more" title="More" icon={<MoreOutlined />}>
                        <Menu.Item key="bridge">
                            <a href={isMainnet ? "https://bridge.accumulatenetwork.io" : "https://testnet.bridge.accumulatenetwork.io"} target="_blank" rel="noopener noreferrer">
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiArrowLeftRightLine /></IconContext.Provider>
                                <span className="nav-text">Bridge</span>
                            </a>
                        </Menu.Item>
                        <Menu.Item key="liquidstaking" style={!isMainnet ? {display: "none"} : null}>
                            <a href="https://accumulated.finance" target="_blank" rel="noopener noreferrer">
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiDropLine /></IconContext.Provider>
                                <span className="nav-text">Liquid Staking</span>
                            </a>
                        </Menu.Item>
                        <Menu.Item key="wallet" style={!isMainnet ? {display: "none"} : null}>
                            <a href="https://accumulatenetwork.io/wallet" target="_blank" rel="noopener noreferrer">
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiWalletLine /></IconContext.Provider>
                                <span className="nav-text">Mobile Wallet</span>
                            </a>
                        </Menu.Item>
                </Menu.SubMenu>

            </Menu>
            {currentNetwork ? (
                <Dropdown overlay={ExplorerSelect} trigger={['click']} className="network-badge">
                    <Button ghost>
                        <Badge status="success" text={currentNetwork} />
                        <DownOutlined />
                    </Button>
                </Dropdown>
            ) :
                null
            }
        </Header>

        <Content style={{ padding: '25px 20px 30px 20px', margin: 0 }}>
            <SearchForm />
            <Switch>
                <Route exact path="/" component={Blocks} />

                {currentNetwork !== "Mainnet" &&
                    <Route exact path="/faucet" component={Faucet} />
                }

                <Route path="/acc/:url+" component={Acc} />
                <Route path="/tx/:hash" component={Tx} />
                <Route path="/block/:index" component={Block} />

                <Route path="/validators" component={Validators} />
                <Route path="/tokens" component={Tokens} />
                <Route path="/staking" component={Staking} />
                <Route path="/favourites" component={Favourites} />

                <Route component={Error404} />
            </Switch>
        </Content>

      </Layout>
      <div align="center" style={{ marginTop: 30, paddingBottom: 20 }} className="footer">
          <p>&copy; Accumulate Network Explorer</p>
            {currentNetwork ? (
                <p>
                <Dropdown overlay={ExplorerSelectFooter} trigger={['click']}>
                    <Button type="link" className="ant-dropdown-link" onClick={e => e.preventDefault()}>
                        {currentNetwork}
                        <DownOutlined style={{ marginLeft: 5 }} />
                    </Button>
                </Dropdown>
                </p>
            ) :
                null
            }
          <p><Version /></p>
          {process.env.REACT_APP_API_PATH ? (
              <p><Text type="secondary">API URL: {process.env.REACT_APP_API_PATH}</Text></p>
          ) : null
          }
          <p><a href="mailto:support@defidevs.io">support@defidevs.io</a></p>
      </div>
    </Router>
  );
};

export default Explorer;
