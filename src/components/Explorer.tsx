import { LoadingOutlined } from '@ant-design/icons';
import { Layout, Spin, Typography, message } from 'antd';
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom';

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
import { Connect } from './web3/Connect';
import { WalletProvider } from './wallet/Context';
import { CurrentAccountProvider, useCurrentAccount } from './wallet/CurrentAccountContext';
import { WalletPanel, WalletToggleButton } from './wallet/WalletPanel';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const Acc = lazy2(() => import('./explorer/Acc'), 'Acc');

export default function Explorer() {
  const onApiError = (error) => {
    console.error(error);
    message.error('API call failed');
  };
  const [shared, setShared] = useState(new Network.Context(onApiError));
  const [walletPanelVisible, setWalletPanelVisible] = useState(false);

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
        <WalletProvider>
          <CurrentAccountProvider>
            <Router>
              <ScrollToTop />
              <Layout>
                <Header className={shared.network.id === 'local' ? 'local' : (shared.network.mainnet ? '' : 'testnet')}>
                  <MainMenu onSelectNetwork={onSelectNetwork} />
                </Header>

                <Content>
                  <SearchForm searching={(x) => (searchDidLoad = x)} />
                  <ErrorBoundary>
                    <Suspense fallback={<Loading />}>
                      <Switch>
                        <Route exact path="/" children={<Blocks />} />
                        <Route path="/validators" children={<Validators />} />
                        <Route path="/tokens" children={<Tokens />} />
                        <Route path="/staking" children={<Staking />} />
                        <Route path="/favourites" children={<Favourites />} />
                        <Route path="/blocks" children={<MinorBlocks />} />
                        <Route
                          path="/network"
                          children={<NetworkDashboard />}
                        />
                        <Route
                          path="/settings"
                          children={<Settings.Edit />}
                        />

                        {!shared.network.mainnet && (
                          <Route
                            exact
                            path="/faucet"
                            children={<Faucet />}
                          />
                        )}

                        <Route path={['/acc/:url+', '/tx/:hash+']}>
                          <AccWithWallet
                            didLoad={(x) => searchDidLoad?.(x)}
                          />
                        </Route>

                        <Route path="/data/:url+" children={<Data />} />
                        <Route path="/block/:index" children={<Block />} />

                        <Route children={<Error404 />} />
                      </Switch>
                    </Suspense>
                  </ErrorBoundary>
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

              {/* Wallet Integration */}
              <WalletPanelWrapper
                visible={walletPanelVisible}
                onClose={() => setWalletPanelVisible(false)}
              />
              <WalletToggleButton onClick={() => setWalletPanelVisible(true)} />
            </Router>
          </CurrentAccountProvider>
        </WalletProvider>
      </Connect>
    </Network.Provider>
  );
}

/**
 * Wrapper for Acc component that updates the current account/transaction context
 */
function AccWithWallet({ didLoad }: { didLoad?: (_: any) => void }) {
  const { setCurrentAccount, setCurrentTransaction } = useCurrentAccount();

  const handleLoad = (record: any) => {
    if (record) {
      // Check if this is a transaction (has message/transaction structure)
      const isTransaction = record.message || record.status !== undefined ||
        record.type === 'transaction' || record.recordType === 'message';

      if (isTransaction) {
        // Extract transaction info
        const txid = record.id?.toString() || record.txid?.toString() || '';
        const hash = record.hash ? Buffer.from(record.hash).toString('hex') :
                     (typeof record.id === 'object' && record.id?.hash ?
                      Buffer.from(record.id.hash).toString('hex') : '');

        // Get transaction type from the message/transaction body
        const txType = record.message?.transaction?.body?.type ||
                       record.transaction?.body?.type ||
                       record.type || 'unknown';

        // Check status - pending if not delivered
        const status = record.status;
        const isPending = status === undefined || status < 200 || status === 'pending';

        // Check if multi-sig (has multiple signatures or is a sequenced message)
        const signatures = record.signatures?.records || [];
        const isMultiSig = signatures.length > 1 || record.message?.type === 'sequenced';

        // Get principal
        const principal = record.message?.transaction?.header?.principal?.toString() ||
                          record.transaction?.header?.principal?.toString() ||
                          record.account?.toString() || '';

        // Get signer URLs from cause field (these are the key pages that initiated)
        const signers = record.cause?.records?.map((c: any) => c.value?.toString()) || [];

        setCurrentTransaction({
          txid,
          hash,
          type: txType?.toString() || 'unknown',
          status: isPending ? 'pending' : (status >= 400 ? 'failed' : 'delivered'),
          isMultiSig,
          signatureCount: signatures.length,
          principal,
          signers,
          data: record,
        });
      } else {
        // It's an account
        const url = record.url || record.account?.url;
        const type = record.type || record.account?.type || 'unknown';
        setCurrentAccount({
          url: url?.toString() || '',
          type: type,
          data: record,
        });
      }
    }
    didLoad?.(record);
  };

  return <Acc parentCallback={handleLoad} didLoad={didLoad} />;
}

/**
 * Wrapper for WalletPanel
 */
function WalletPanelWrapper({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <WalletPanel
      visible={visible}
      onClose={onClose}
    />
  );
}
