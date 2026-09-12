import { LoadingOutlined } from '@ant-design/icons';
import { Layout, Spin, message } from 'antd';
import React, { Suspense, useEffect, useState } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import { ErrorBoundary } from './common/ErrorBoundary';
import MinorBlocks from './common/MinorBlocks';
import {
  Network,
  ambientNetworkName,
  unknownNetworkParam,
  withNetworkParam,
} from './common/Network';
import ScrollToTop from './common/ScrollToTop';
import { SearchForm } from './common/SearchForm';
import { Version } from './common/Version';
import { lazy2 } from './common/lazy2';
import { NetworkConfig, offeredNetworks } from './common/networks';
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

/**
 * Every path the router serves.
 *
 * Exported so routes.test.ts can drive itself off the real table. It used to
 * hardcode the same strings, which meant it verified react-router's matchPath
 * rather than this application: changing a path here left the test passing
 * (#67).
 */
export const ROUTES = {
  home: '/',
  validators: '/validators',
  tokens: '/tokens',
  staking: '/staking',
  favourites: '/favourites',
  blocks: '/blocks',
  network: '/network',
  settings: '/settings',
  faucet: '/faucet',
  account: '/acc/*',
  transaction: '/tx/*',
  data: '/data/*',
  block: '/block/:index',
  notFound: '*',
} as const;

/** Every path the router serves, in the order it matches them. */
export const ROUTE_PATHS = Object.values(ROUTES);

/** Whether this page is being served from one of the deployed explorers. */
function onDeployedExplorerHost() {
  if (typeof window === 'undefined') return false;
  return offeredNetworks().some(
    (x) => x.explorer && new URL(x.explorer).origin === window.location.origin,
  );
}

export default function Explorer() {
  const onApiError = (error) => {
    console.error(error);
    message.error('API call failed');
  };
  const [shared, setShared] = useState(new Network.Context(onApiError));

  // A ?network= naming nothing falls through to the ordinary default rather
  // than failing the page, but it is said out loud: a typo that silently
  // showed the wrong network would be the defect this parameter exists to fix.
  useEffect(() => {
    const bad = unknownNetworkParam(window.location.search);
    if (bad) {
      message.warning(
        `Unknown network "${bad}" — showing ${ambientNetworkName()} instead`,
      );
    }
  }, []);

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

  // Selecting a network navigates; it does not store a preference. A stored
  // one used to outrank the host, so anyone who had ever used this menu
  // overrode every network-specific link they were later given. Now the URL
  // says which network is on screen, so a link copied from here works for the
  // next person whatever they default to (#84).
  const onSelectNetwork = (item: NetworkConfig) => {
    const { pathname, search } = window.location;

    // Where this app is deployed at a network's own address, prefer it: the
    // host then names the network and the URL needs no parameter. Not in
    // development, where the deployed hosts are somebody else's server.
    const base = item.explorer && onDeployedExplorerHost() ? item.explorer : '';
    if (base && new URL(base).origin !== window.location.origin) {
      const params = new URLSearchParams(search);
      params.delete('network');
      const q = params.toString();
      window.location.href = new URL(
        pathname + (q ? `?${q}` : ''),
        base,
      ).toString();
      return;
    }

    window.location.href = withNetworkParam(pathname, search, item.id);
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
          <Network.KeepParam />
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
                    <Route path={ROUTES.home} element={<Blocks />} />
                    <Route path={ROUTES.validators} element={<Validators />} />
                    <Route path={ROUTES.tokens} element={<Tokens />} />
                    <Route path={ROUTES.staking} element={<Staking />} />
                    <Route path={ROUTES.favourites} element={<Favourites />} />
                    <Route path={ROUTES.blocks} element={<MinorBlocks />} />
                    <Route
                      path={ROUTES.network}
                      element={<NetworkDashboard />}
                    />
                    <Route path={ROUTES.settings} element={<Settings.Edit />} />

                    {!shared.network.mainnet && (
                      <Route path={ROUTES.faucet} element={<Faucet />} />
                    )}

                    {/* Splat routes: the account/tx URL follows the prefix and
                        may contain slashes (read via useParams()['*']). */}
                    <Route
                      path={ROUTES.account}
                      element={<Acc didLoad={(x) => searchDidLoad?.(x)} />}
                    />
                    <Route
                      path={ROUTES.transaction}
                      element={<Acc didLoad={(x) => searchDidLoad?.(x)} />}
                    />

                    <Route path={ROUTES.data} element={<Data />} />
                    <Route path={ROUTES.block} element={<Block />} />

                    <Route path={ROUTES.notFound} element={<Error404 />} />
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
