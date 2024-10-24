import { Button, List, Modal, ModalProps, Select, Skeleton } from 'antd';
import React, { useContext, useEffect, useState } from 'react';

import { LiteIdentity } from 'accumulate.js/lib/core';

import { isRecordOf } from '../../utils/types';
import { Network } from '../common/Network';
import { useShared } from '../common/Shared';
import { isErrorRecord } from '../common/query';
import { Context, Provider } from './Context';
import { Driver, EthPublicKey } from './Driver';
import { Linked } from './Linked';
import { OfflineStore } from './OfflineStore';
import { OnlineStore } from './OnlineStore';
import { Settings } from './Settings';
import { Store } from './Store';
import { useWalletConnect } from './WalletConnect';

export default Connect;

type Action = 'init' | 'connect' | 'switch' | 'reload';

interface ActionArgs {
  oldAccount?: string;
  mustLogIn?: boolean;
}

class ActionRequest {
  readonly action: Action;
  readonly args: ActionArgs;
  readonly result: Promise<Context | null>;
  #resolve: (ok: Context | null) => void;
  #executed = false;

  constructor(action: Action, args: ActionArgs = {}) {
    this.action = action;
    this.args = args;
    this.result = new Promise<Context | null>((resolve) => {
      this.#resolve = (ok) => {
        resolve(ok);
        this.#executed = true;
      };
    });
  }

  resolve(ok: Context | null) {
    this.#resolve(ok);
  }

  get executed() {
    return this.#executed;
  }
}

interface Resolver<T = unknown> {
  resolve(value?: T): void;
}

interface ModalOptions<T = unknown>
  extends Omit<ModalProps, 'children'>,
    Resolver<T> {
  children(_: Resolver<T>): React.ReactNode;
}

const Processing = (_: Resolver) => (
  <Skeleton
    className={'skeleton-singleline'}
    active
    title={true}
    paragraph={false}
  />
);

const SelectDriver =
  ({ walletConnect }: { walletConnect: boolean }) =>
  ({ resolve }: Resolver<typeof Settings.connected>) => (
    <div>
      <List>
        <List.Item>
          <Button
            block
            shape="round"
            size="large"
            disabled={!window.ethereum}
            onClick={() => resolve('Web3')}
          >
            MetaMask
          </Button>
        </List.Item>
      </List>
      <List>
        <List.Item>
          <Button
            block
            shape="round"
            size="large"
            disabled={!walletConnect}
            onClick={() => resolve('WalletConnect')}
          >
            WalletConnect
          </Button>
        </List.Item>
      </List>
    </div>
  );

const SelectAccount =
  ({ accounts }: { accounts: string[] }) =>
  ({ resolve }: Resolver<string>) => (
    <Select
      style={{ width: '100%' }}
      placeholder="Select an account"
      onSelect={(x) => resolve(x)}
    >
      {accounts.map((x) => (
        <Select.Option key={x} value={x}>
          {x}
        </Select.Option>
      ))}
    </Select>
  );

interface ConnectionState {
  driver?: Driver;
  pubKey?: EthPublicKey;
  liteIdentity?: LiteIdentity;
  dataStore?: Store;
  onlineStore?: OnlineStore;
  linked?: Linked;
}

interface SharedState {
  connected: typeof Settings.connected;
  account: string;
}

export function Connect({ children }: { children: React.ReactNode }) {
  const { api, network } = useContext(Network);
  const [walletConnect] = useWalletConnect();
  const [connected, setConnected] = useShared(Settings, 'connected');
  const [account, setAccount] = useShared(Settings, 'account');

  const [state, setState] = useState<ConnectionState>({});

  const newContext = (s: ConnectionState & SharedState): Context => ({
    connect: () =>
      makeRequest('connect', {
        mustLogIn: !(s.account && Settings.getKey(s.account)),
      }),
    switch: () => makeRequest('switch', { oldAccount: s.account }),
    reload: () => makeRequest('reload'),

    disconnect,
    canConnect: true,
    connected: !!s.pubKey,
    driver: s.driver,
    publicKey: s.pubKey,
    liteIdentity: s.liteIdentity,
    dataStore: s.dataStore,
    onlineStore: s.onlineStore,
    linked: s.linked,
  });

  const [modal, setModal] = useState<ModalOptions>(null);
  const [request, setRequest] = useState<ActionRequest>(
    new ActionRequest('init'),
  );

  const makeRequest = (action: Action, args: ActionArgs = {}) => {
    const r = new ActionRequest(action, args);
    setRequest(r);
    return r.result;
  };

  const showModal = <T extends unknown>(
    props: Omit<ModalOptions<T>, 'resolve'>,
  ) => {
    let resolve: (_: T) => void;
    const p = new Promise<T>((r) => (resolve = r));
    setModal({ ...props, resolve });
    return p;
  };

  const connect = async ({
    mounted,
    connected,
    account,
    driver,
    pubKey,
    liteIdentity,
    dataStore,
    onlineStore,
    linked,
  }: ConnectionState & SharedState & { mounted(): boolean }): Promise<
    (ConnectionState & SharedState & { ok: boolean }) | undefined
  > => {
    const packState = (ok: boolean) => ({
      connected,
      account,
      driver,
      pubKey,
      liteIdentity,
      dataStore,
      onlineStore,
      linked,
      ok,
    });

    // [Page load] Don't prompt the user to unlock the wallet
    if (request.action === 'init' && window.ethereum?.isMetaMask) {
      if (!(await window.ethereum._metamask.isUnlocked())) {
        return;
      }
    }

    if (!mounted()) {
      return;
    }

    // [Page load] Don't prompt the user to select a driver
    if (request.action === 'init' && !connected) {
      return packState(false);
    }

    // Select a driver
    if (!connected) {
      connected = await showModal<typeof Settings.connected>({
        title: 'Connect',
        children: SelectDriver({ walletConnect: !!walletConnect }),
      });
      if (!mounted() || !connected) {
        return packState(false);
      }
    }

    if (!driver) {
      switch (connected) {
        case 'Web3':
          driver = new Driver(window.ethereum as any);
          break;

        case 'WalletConnect':
          const provider = await walletConnect?.connect({
            headless: request.action === 'init',
          });
          if (!provider) {
            return packState(false);
          }
          driver = new Driver(provider);
          break;

        default:
          throw new Error(`Invalid driver type ${connected}`);
      }
    }

    switch (request.action) {
      case 'connect':
      case 'switch':
        showModal({
          title: 'Connecting',
          children: Processing,
        });
        break;
    }

    // Request permissions
    await driver.connect();

    // List accounts
    const accounts = await driver.listAccounts();

    // Switch the chain to Accumulate
    await driver.switchChains(network);
    if (!mounted()) {
      return;
    }

    // If there's only one account, select it
    if (
      request.action !== 'switch' &&
      accounts.length === 1 &&
      account !== accounts[0]
    ) {
      account = accounts[0];
    }

    // [Page load] Don't prompt the user to select an account
    const didSelectAccount =
      request.args.oldAccount !== account &&
      account &&
      accounts.includes(account);
    if (request.action === 'init' && !didSelectAccount) {
      return packState(false);
    }

    // Select an account
    if (!didSelectAccount || (request.args.mustLogIn && accounts.length > 1)) {
      account = await showModal<string>({
        title: 'Select an account',
        children: SelectAccount({ accounts }),
      });
      if (!mounted() || !account) {
        return packState(false);
      }
    }

    // Check for a known public key
    if (pubKey?.ethereum?.toLowerCase() !== account.toLowerCase()) {
      const storedKey = Settings.getKey(account);
      if (storedKey) {
        pubKey = new EthPublicKey(storedKey);
      }
    }

    // [Page load] Don't prompt the user to login
    if (request.action === 'init' && !pubKey) {
      return packState(false);
    }

    // Recover the public key
    if (!pubKey) {
      showModal({
        title: 'Logging in',
        children: Processing,
      });

      const message = 'Login to Accumulate';
      const signature = await driver.signEthMessage(account, message);
      if (!mounted()) {
        return;
      }
      if (!signature) {
        if (request.args.oldAccount) {
          account = request.args.oldAccount;
        }
        return packState(false);
      }

      pubKey = EthPublicKey.recover(signature, message);
      if (pubKey.ethereum.toLowerCase() !== account.toLowerCase()) {
        throw new Error('Failed to recover public key');
      }

      Settings.putKey(account, pubKey.publicKey);
    }

    // Load account data
    const lda = await api.query(pubKey.lite).catch(isErrorRecord);
    if (!mounted()) {
      return;
    }
    if (isRecordOf(lda, LiteIdentity)) {
      liteIdentity = lda.account;
    } else {
      // Use a placeholder so that the dashboard works
      liteIdentity = new LiteIdentity({ url: pubKey.lite });
    }

    onlineStore = new OnlineStore(driver, pubKey);
    if (Driver.canEncrypt) {
      await onlineStore.load(api).catch((err) => {
        console.error(err);
      });
      if (!mounted()) {
        return;
      }
    }

    dataStore = onlineStore.enabled
      ? onlineStore
      : new OfflineStore(pubKey.publicKey);
    linked = await Linked.load(api, [
      {
        type: 'link',
        accountType: 'identity',
        url: `${pubKey.lite}`,
      },
      ...dataStore,
    ]);

    return packState(true);
  };

  const disconnect = () => {
    walletConnect?.disconnect();
    request?.resolve(null);
    setModal(null);

    setConnected(null);
    setAccount(null);
    setState({});
  };

  useEffect(() => {
    let mounted = true;

    if (!request || request.executed) {
      return;
    }

    connect({
      ...state,
      connected,
      account,
      mounted: () => mounted,
    })
      .then((r) => {
        if (!mounted || !r) {
          return;
        }
        const {
          connected,
          account,
          driver,
          pubKey,
          liteIdentity,
          dataStore,
          onlineStore,
          linked,
          ok,
        } = r;

        if (!ok && request.action === 'connect') {
          // If the user cancels an explict connection request, reset
          disconnect();
        } else {
          const state = {
            driver,
            pubKey,
            liteIdentity,
            dataStore,
            onlineStore,
            linked,
          };
          setModal(null);
          setConnected(connected);
          setAccount(account);
          setState(state);
          request?.resolve(newContext({ ...state, connected, account }));
        }
      })
      .catch((e) => {
        console.error(e);
        request?.resolve(null);
      });

    return () => {
      mounted = false;
    };
  }, [
    request,
    connected,
    state.driver,
    network,
    account,
    state.pubKey?.ethereum,
    walletConnect,
  ]);

  // Render
  return (
    <Provider value={newContext({ ...state, connected, account })}>
      {children}

      {modal && (
        <Modal
          {...modal}
          open={!!modal}
          footer={false}
          onCancel={() => {
            modal.resolve();
            setModal(null);
          }}
          children={modal.children({
            resolve: (v) => {
              modal.resolve(v);
            },
          })}
        />
      )}
    </Provider>
  );
}