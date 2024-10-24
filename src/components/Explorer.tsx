import { LoadingOutlined } from '@ant-design/icons';
import { Layout, Spin, Typography, message } from 'antd';
import React, { Suspense, useEffect, useState } from 'react';
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom';

import MinorBlocks from './common/MinorBlocks';
import { Network } from './common/Network';
import ScrollToTop from './common/ScrollToTop';
import { SearchForm } from './common/SearchForm';
import { Version } from './common/Version';
import { lazy2 } from './common/lazy2';
import Block from './explorer/Block';
import Blocks from './explorer/Blocks';
import Data from './explorer/Data';
import Error404 from './explorer/Error404';
import Faucet from './explorer/Faucet';
import Favourites from './explorer/Favourites';
import { MainMenu } from './explorer/MainMenu';
import NetworkDashboard from './explorer/NetworkDashboard';
import { Settings } from './explorer/Settings';
import Staking from './explorer/Staking';
import Tokens from './explorer/Tokens';
import Validators from './explorer/Validators';
import { Connect } from './web3/Connect';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const Acc = lazy2(() => import('./explorer/Acc'), 'Acc');

export default function Explorer() {
  const onApiError = (error) => {
    console.error(error);
    message.error('API call failed');
  };
  const [shared, setShared] = useState(new Network.Context(onApiError));

  // Run once
  useEffect(() => {
    Network.Context.onBroadcast((message) => {
      switch (message.type) {
        case 'didChangeNetwork':
          setShared(new Network.Context(onApiError, message.networkID));
      }
    });
  }, []);

  let searchDidLoad;

  const onSelectNetwork = (item) => {
    setShared(new Network.Context(onApiError, item));
    Network.Context.postBroadcast({
      type: 'didChangeNetwork',
      networkID: item.id,
    });
  };

  const Loading = () => (
    <Spin
      tip="Loading..."
      indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
    />
  );

  return (
    <Network.Provider value={shared}>
      <Connect>
        <Router>
          <ScrollToTop />
          <Layout>
            <Header className={shared.network.mainnet ? '' : 'testnet'}>
              <MainMenu onSelectNetwork={onSelectNetwork} />
            </Header>

            <Content>
              <SearchForm searching={(x) => (searchDidLoad = x)} />
              <Suspense fallback={<Loading />}>
                <Switch>
                  <Route exact path="/" children={<Blocks />} />
                  <Route path="/validators" children={<Validators />} />
                  <Route path="/tokens" children={<Tokens />} />
                  <Route path="/staking" children={<Staking />} />
                  <Route path="/favourites" children={<Favourites />} />
                  <Route path="/blocks" children={<MinorBlocks />} />
                  <Route path="/network" children={<NetworkDashboard />} />
                  <Route path="/settings" children={<Settings.Edit />} />

                  {!shared.network.mainnet && (
                    <Route exact path="/faucet" children={<Faucet />} />
                  )}

                  <Route
                    path={[
                      '/acc/:url+',
                      '/token/:url+',
                      '/tx/:hash+',
                      '/address/:address',
                    ]}
                  >
                    <Acc didLoad={(x) => searchDidLoad?.(x)} />
                  </Route>

                  <Route path="/data/:url+" children={<Data />} />
                  <Route path="/block/:index" children={<Block />} />

                  <Route children={<Error404 />} />
                </Switch>
              </Suspense>
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
      </Connect>
    </Network.Provider>
  );
}
