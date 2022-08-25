import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Link, Switch } from 'react-router-dom';

import * as Realm from "realm-web";
import {
  ApolloClient,
  ApolloProvider,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";

import { Layout, Menu, Dropdown, Button, Badge, Typography } from 'antd';

import {
  DownOutlined
} from '@ant-design/icons';

import { IconContext } from "react-icons";
import {
  RiDashboardLine, RiWalletLine, RiBook2Line, RiCoinLine, RiShieldCheckLine
} from 'react-icons/ri';

import Logo from './common/Logo';
import Version from './common/Version';
import ScrollToTop from './common/ScrollToTop';
import SearchForm from './common/SearchForm';

import Blocks from './explorer/Blocks';

import Acc from './explorer/Acc';
import Tx from './explorer/Tx';
import Chain from './explorer/Chain';
import Error404 from './explorer/Error404';
import Faucet from './explorer/Faucet';
import Validators from './explorer/Validators';
import Tokens from './explorer/Tokens';

const { Header, Content } = Layout;
const { Text } = Typography;

const Explorer = props => {

    const app = new Realm.App(process.env.REACT_APP_ID);
    const graphqlUri = `https://realm.mongodb.com/api/client/v2.0/app/` + process.env.REACT_APP_ID + `/graphql`;

    // Gets a valid Realm user access token to authenticate requests
    async function getValidAccessToken() {
        // Guarantee that there's a logged in user with a valid access token
        if (!app.currentUser) {
            // If no user is logged in, log in an anonymous user. The logged in user will have a valid
            // access token.
            await app.logIn(Realm.Credentials.anonymous());
        } else {
            // An already logged in user's access token might be stale. To guarantee that the token is
            // valid, we refresh the user's custom data which also refreshes their access token.
            await app.currentUser.refreshCustomData();
        }
        return app.currentUser.accessToken;
    }

    const client = new ApolloClient({
        link: new HttpLink({
          uri: graphqlUri,
          // We define a custom fetch handler for the Apollo client that lets us authenticate GraphQL requests.
          // The function intercepts every Apollo HTTP request and adds an Authorization header with a valid
          // access token before sending the request.
          fetch: async (uri, options) => {
            const accessToken = await getValidAccessToken();
            options.headers.Authorization = `Bearer ${accessToken}`;
            return fetch(uri, options);
          },
        }),
        cache: new InMemoryCache(),
    });

  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [currentMenu, setCurrentMenu] = useState([window.location.pathname]);

  const handleMenuClick = e => {
    if (e.key === "logo") {
        setCurrentMenu("/blocks");
    } else {
        setCurrentMenu([e.key]);
    }
  };

  const ExplorerSelect = (
    <Menu>
      <Menu.Item key="Mainnet" disabled>
          <a target="_blank" rel="noopener noreferrer" href="https://explorer.accumulatenetwork.io">
              <Badge status="default" text="Mainnet (soon)" />
          </a>
      </Menu.Item>
      <Menu.Item key="Testnet (Beta RC2)">
          <a target="_blank" rel="noopener noreferrer" href="https://explorer.accumulatenetwork.io">
              <Badge status="success" text="Testnet (Beta RC2)" />
          </a>
      </Menu.Item>
      <Menu.Item key="Testnet (Beta RC1)">
          <a target="_blank" rel="noopener noreferrer" href="https://beta.explorer.accumulatenetwork.io">
              <Badge status="success" text="Testnet (Beta RC1)" />
          </a>
      </Menu.Item>
    </Menu>
  );

  const ExplorerSelectFooter = (
    <Menu>
      <Menu.Item key="Mainnet" disabled>
            <a target="_blank" rel="noopener noreferrer" href="https://explorer.accumulatenetwork.io">
                Mainnet (soon)
            </a>
      </Menu.Item>
      <Menu.Item key="Testnet (Beta RC2)">
            <a target="_blank" rel="noopener noreferrer" href="https://explorer.accumulatenetwork.io">
                Testnet (Beta RC2)
            </a>
      </Menu.Item>
      <Menu.Item key="Testnet (Beta RC1)">
            <a target="_blank" rel="noopener noreferrer" href="https://beta.explorer.accumulatenetwork.io">
                Testnet (Beta RC1)
            </a>
      </Menu.Item>
    </Menu>
  );

  useEffect(() => {

    if (process.env.REACT_APP_API_PATH) {
      switch (process.env.REACT_APP_API_PATH) {
        case 'https://mainnet.accumulatenetwork.io/v2':
            setCurrentNetwork("Mainnet");
            break;
        case 'https://beta.testnet.accumulatenetwork.io/v2':
            setCurrentNetwork("Testnet (Beta RC1)");
            break;
        case 'https://testnet.accumulatenetwork.io/v2':
            setCurrentNetwork("Testnet (Beta RC2)");
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
  
    if (window.location.pathname.includes("validators")) {
      setCurrentMenu("/validators");
    }

  }, []);
    
  return (
    <ApolloProvider client={client}>
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
                        <span className="nav-text">Home</span>
                    </Link>
                </Menu.Item>
                <Menu.Item key="/tokens">
                    <Link to="/tokens">
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiCoinLine /></IconContext.Provider>
                        <span className="nav-text">Tokens</span>
                    </Link>
                </Menu.Item>
                <Menu.Item key="/validators">
                    <Link to="/validators">
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiShieldCheckLine /></IconContext.Provider>
                        <span className="nav-text">Validators</span>
                    </Link>
                </Menu.Item>
                <Menu.Item key="wallet">
                    <a href="https://accumulatenetwork.io/wallet" target="_blank" rel="noopener noreferrer">
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiWalletLine /></IconContext.Provider>
                        <span className="nav-text">Wallet</span>
                    </a>
                </Menu.Item>
                <Menu.Item key="docs">
                    <a href="https://docs.accumulatenetwork.io" target="_blank" rel="noopener noreferrer">
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiBook2Line /></IconContext.Provider>
                        <span className="nav-text">Docs</span>
                    </a>
                </Menu.Item>
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
                <Route exact path="/faucet" component={Faucet} />

                <Route path="/acc/:url+" component={Acc} />
                <Route path="/tx/:hash" component={Tx} />
                <Route path="/chain/:chainid" component={Chain} />

                <Route path="/validators" component={Validators} />
                <Route path="/tokens" component={Tokens} />

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
    </ApolloProvider>
  );
};

export default Explorer;
