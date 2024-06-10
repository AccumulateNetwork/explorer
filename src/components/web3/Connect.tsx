import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { Button, List, Modal, Select, Skeleton } from 'antd';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { LiteIdentity } from 'accumulate.js/lib/core';

import { isRecordOf } from '../../utils/types';
import { Shared } from '../common/Network';
import { useShared } from '../common/Shared';
import { isErrorRecord } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { Sign } from '../form/Sign';
import { Driver, EthPublicKey } from './Driver';
import { Linked } from './Linked';
import { OfflineStore } from './OfflineStore';
import { OnlineStore } from './OnlineStore';
import { Settings } from './Settings';
import { Store } from './Store';

interface ConnectRequest {
  resolve: (ok: boolean) => void;
}

interface ReloadRequest {
  liteIdentity?: boolean;
  dataStore?: boolean;
}

interface Request {
  executed?: boolean;
}

export interface Context {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  reload: (rq: ReloadRequest) => void;
  switch: () => void;

  canConnect: boolean;
  connected: boolean;

  driver: Driver | null;
  publicKey: EthPublicKey | null;
  liteIdentity: LiteIdentity | null;
  dataStore: Store | null;
  onlineStore: OnlineStore | null;
  linked: Linked | null;
}

const reactContext = createContext<Context>({
  connect: () => Promise.reject(),
  disconnect() {},
  reload() {},
  switch() {},
  canConnect: Driver.canConnect,
  connected: false,
  driver: null,
  publicKey: null,
  liteIdentity: null,
  dataStore: null,
  onlineStore: null,
  linked: null,
});

export function useWeb3() {
  return useContext(reactContext);
}

export function Connect({ children }: { children: React.ReactNode }) {
  const { api } = useContext(Shared);
  const { activate, deactivate } = useWeb3React();

  // Handle reload requests
  const [wantReload, setWantReload] = useState<ReloadRequest>({});
  const [reloadLiteIdentity, setReloadLiteIdentity] = useState(0);
  const [reloadDataStore, setReloadDataStore] = useState(0);
  const reload = (rq: ReloadRequest) => setWantReload(rq);

  useEffect(() => {
    if (!wantReload) {
      return;
    }

    if (wantReload.liteIdentity) {
      delete wantReload.liteIdentity;
      setReloadLiteIdentity(reloadLiteIdentity + 1);
    }

    if (wantReload.dataStore) {
      delete wantReload.dataStore;
      setReloadDataStore(reloadDataStore + 1);
    }
  }, [wantReload]);

  const [open, setOpen] = useState<'connect' | 'select'>();
  const [wantConnect, setWantConnect] = useState<ConnectRequest>();
  const connect = () => {
    // Create a promise for the caller. Expose onResolve via resolveConnect, but
    // clear resolveConnect once it is called.
    const p = new Promise<boolean>((r) =>
      setWantConnect({
        resolve(ok) {
          r(ok);
          setWantConnect(null);
        },
      }),
    );

    // Open the Connect Wallet modal
    setOpen('connect');
    return p;
  };

  const disconnect = () => {
    // Deactivate the connector
    deactivate();

    // Resolve the connection promise
    wantConnect?.resolve?.(false);

    // Reset state
    setOpen(null);
    setConnected(null);
    setDriver(null);
    setAccount(null);
    setPubKey(null);
    setLiteIdentity(null);
    setDataStore(null);
    setOnlineStore(null);
    setLinked(null);
    setWantSwitch(null);
    Settings.account = null;
  };

  // Choose connection type
  const [connected, setConnected] = useShared(Settings, 'connected');
  const [driver, setDriver] = useState<Driver>(null);

  useEffect(() => {
    switch (connected) {
      case 'Web3':
        const driver = new Driver(window.ethereum);
        const connector = new InjectedConnector({});
        activate(connector);
        setDriver(driver);
        setWantSwitch(null);
        break;
      default:
        disconnect();
        break;
    }
  }, [connected]);

  // Select an account
  const [account, setAccount] = useState<string>();
  const [accounts, setAccounts] = useState<string[]>();
  const [wantSwitch, setWantSwitch] = useState<Request>();

  useAsyncEffect(
    async (mounted) => {
      const switching = wantSwitch && !wantSwitch.executed;
      if (switching) {
        wantSwitch.executed = true;
      }
      if (!driver) {
        return;
      }

      const accounts = await driver.web3.eth.getAccounts();
      if (!mounted()) {
        return;
      }
      setAccounts(accounts);

      if (
        !switching &&
        Settings.account &&
        accounts.includes(Settings.account)
      ) {
        setAccount(Settings.account);
        return;
      }

      switch (accounts?.length) {
        case 0:
          return;
        case 1:
          setAccount(accounts[0]);
          return;
        default:
          setOpen('select');
      }
    },
    [driver, wantSwitch],
  );

  // Get public key
  const [pubKey, setPubKey] = useState<EthPublicKey>();
  const [request, setRequest] = useState<Sign.WaitForRequest<Uint8Array>>();

  useAsyncEffect(
    async (mounted) => {
      if (!account) {
        return;
      }

      Settings.account = account;
      const storedKey = Settings.getKey(account);
      if (storedKey) {
        setPubKey(new EthPublicKey(storedKey));
        wantConnect?.resolve?.(true);
        return;
      }

      if (!wantConnect) {
        return;
      }

      // TODO: switch to the driver
      const message = 'Login to Accumulate';
      const [signature] =
        (await Sign.waitFor(setRequest, () =>
          driver.sign.eth(account, message, true),
        )) || [];
      if (!mounted()) {
        return;
      }
      if (!signature) {
        disconnect();
        return;
      }

      const pubKey = EthPublicKey.recover(signature, message);
      if (pubKey.ethereum.toLowerCase() !== account.toLowerCase()) {
        throw new Error('Failed to recover public key');
      }

      Settings.putKey(account, pubKey.publicKey);
      setPubKey(pubKey);
      wantConnect?.resolve?.(true);
    },
    [account],
  );

  // Load the lite identity
  const [liteIdentity, setLiteIdentity] = useState<LiteIdentity>();
  useAsyncEffect(
    async (mounted) => {
      if (!pubKey?.lite) {
        return;
      }

      const r = await api.query(pubKey.lite).catch(isErrorRecord);
      if (mounted() && isRecordOf(r, LiteIdentity)) {
        setLiteIdentity(r.account);
      }
    },
    [pubKey?.lite, reloadLiteIdentity],
  );

  // Load the data store and linked accounts
  const [dataStore, setDataStore] = useState<Store>();
  const [onlineStore, setOnlineStore] = useState<OnlineStore>();
  const [linked, setLinked] = useState<Linked>();
  useAsyncEffect(
    async (mounted) => {
      if (!driver || !pubKey) {
        setDataStore(null);
        return;
      }

      const online = new OnlineStore(driver, pubKey);
      setOnlineStore(online);

      await online.load(api).catch((err) => {
        console.error(err);
      });
      if (!mounted()) {
        return;
      }

      const store = online.enabled
        ? online
        : new OfflineStore(pubKey.publicKey);
      setDataStore(store);

      const linked = await Linked.load(api, [
        {
          type: 'link',
          accountType: 'identity',
          url: `${pubKey.lite}`,
        },
        ...store,
      ]);
      if (!mounted()) {
        return;
      }
      setLinked(linked);
    },
    [pubKey, reloadDataStore],
  );

  // Render
  return (
    <reactContext.Provider
      value={{
        connect,
        disconnect,
        reload,
        switch: () => setWantSwitch({}),

        canConnect: true,
        connected: !!pubKey,
        driver,
        publicKey: pubKey,
        liteIdentity,
        dataStore,
        onlineStore,
        linked,
      }}
    >
      {children}

      {/* Modals */}
      <Sign.WaitFor title="Login" closeWhenDone request={request} />

      {open === 'connect' && (
        <Modal
          title="Connect Wallet"
          open={open === 'connect'}
          onCancel={() => disconnect()}
          footer={false}
        >
          <List>
            <List.Item>
              <Button
                block
                shape="round"
                size="large"
                onClick={() => (setOpen(null), setConnected('Web3'))}
                disabled={!window.ethereum}
                children="MetaMask"
              />
            </List.Item>
          </List>
          <List>
            <List.Item>
              <Button block shape="round" size="large" disabled>
                WalletConnect
              </Button>
            </List.Item>
          </List>
        </Modal>
      )}

      {open === 'select' && (
        <Modal
          title="Select account"
          open={open === 'select'}
          onCancel={() => {
            if (wantSwitch.executed) {
              setOpen(null);
            } else {
              disconnect();
            }
          }}
          footer={false}
        >
          {accounts ? (
            <Select
              style={{ width: '100%' }}
              placeholder="Select an account"
              onSelect={(x) => (setOpen(null), setAccount(x))}
            >
              {accounts.map((x) => (
                <Select.Option key={x} value={x}>
                  {x}
                </Select.Option>
              ))}
            </Select>
          ) : (
            <Skeleton />
          )}
        </Modal>
      )}
    </reactContext.Provider>
  );
}
