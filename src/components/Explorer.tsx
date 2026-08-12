import { LoadingOutlined } from '@ant-design/icons';
import { Layout, Spin, message } from 'antd';
import React, { Suspense, useEffect, useState } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import { ErrorBoundary } from './common/ErrorBoundary';
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
import { WalletDock } from './wallet/WalletDock';
import { Connect } from './web3/Connect';

const { Header, Content, Footer } = Layout;

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
    // The only place a network is persisted: this is the user choosing one.
    // Other tabs on this origin share the same storage, so the broadcast
    // handler above does not need to write it again.
    Settings.selectedNetwork = item.id;
    setShared(new Network.Context(onApiError, item));
    Network.Context.postBroadcast({
      type: 'didChangeNetwork',
      networkID: item.id,
    });
    // Force page reload to clear old network data and show new network
    window.location.href = '/';
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
            <Header
              className={
                shared.network.id === 'local'
                  ? 'local'
                  : shared.network.mainnet
                    ? ''
                    : 'testnet'
              }
            >
              <MainMenu onSelectNetwork={onSelectNetwork} />
            </Header>

            <Content>
              <SearchForm searching={(x) => (searchDidLoad = x)} />
              <ErrorBoundary>
                <Suspense fallback={<Loading />}>
                  <Routes>
                    <Route path="/" element={<Blocks />} />
                    <Route path="/validators" element={<Validators />} />
                    <Route path="/tokens" element={<Tokens />} />
                    <Route path="/staking" element={<Staking />} />
                    <Route path="/favourites" element={<Favourites />} />
                    <Route path="/blocks" element={<MinorBlocks />} />
                    <Route path="/network" element={<NetworkDashboard />} />
                    <Route path="/settings" element={<Settings.Edit />} />

                    {!shared.network.mainnet && (
                      <Route path="/faucet" element={<Faucet />} />
                    )}

                    {/* Splat routes: the account/tx URL follows the prefix and
                        may contain slashes (read via useParams()['*']). */}
                    <Route
                      path="/acc/*"
                      element={<Acc didLoad={(x) => searchDidLoad?.(x)} />}
                    />
                    <Route
                      path="/tx/*"
                      element={<Acc didLoad={(x) => searchDidLoad?.(x)} />}
                    />

                    <Route path="/data/*" element={<Data />} />
                    <Route path="/block/:index" element={<Block />} />

                    <Route path="*" element={<Error404 />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </Content>

            <Footer>
              <p>&copy; Accumulate Network Explorer</p>
              <p>
                <Version />
              </p>
              <p>
                <a href="mailto:support@defidevs.io">support@defidevs.io</a>
              </p>
            </Footer>
            <WalletDock />
          </Layout>
        </Router>
      </Connect>
    </Network.Provider>
  );
}
