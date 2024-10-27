import { Button, List, Modal, ModalProps, Skeleton } from 'antd';
import React, { useContext, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import { LiteIdentity } from 'accumulate.js/lib/core';

import { isRecordOf } from '../../utils/types';
import { Network } from '../common/Network';
import { useShared } from '../common/Shared';
import { ShowError } from '../common/ShowError';
import { isErrorRecord } from '../common/query';
import { Context, Provider } from './Context';
import { Driver, EthPublicKey } from './Driver';
import { Linked } from './Linked';
import { OfflineStore } from './OfflineStore';
import { OnlineStore } from './OnlineStore';
import { Settings } from './Settings';
import { Store } from './Store';

// import { useWalletConnect } from './WalletConnect';

export default Connect;

interface Init {
  type: 'init';
}

interface Connect {
  type: 'connect';
}

interface Reload {
  type: 'reload';
}

interface Login {
  type: 'login';
  account: Context.Account;
}

type Action = Init | Connect | Reload | Login;

class ActionRequest {
  readonly action: Action;
  readonly result: Promise<Context>;
  #resolve: (ok: Context) => void = () => {};
  #reject: (reason: Error) => void = () => {};
  #executed = false;

  constructor(action: Action) {
    this.action = action;
    this.result = new Promise<Context>((resolve, reject) => {
      this.#resolve = (ok) => {
        resolve(ok);
        this.#executed = true;
      };
      this.#reject = (reason) => {
        reject(reason);
      };
    });
  }

  resolve(ok: Context) {
    this.#resolve(ok);
  }

  reject(reason: Error) {
    this.#reject(reason);
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

interface ConnectionState {
  driver?: Driver;
  dataStore?: Store;
  onlineStore?: OnlineStore;
  accounts: Context.Account[];
  linked?: Linked;
}

interface SharedState {
  connected: typeof Settings.connected;
  activeAccounts: string[];
}

export function Connect({ children }: { children: React.ReactNode }) {
  const { api, network } = useContext(Network);
  // const [walletConnect] = useWalletConnect();
  const walletConnect: unknown = undefined;
  const [connected, setConnected] = useShared(Settings, 'connected');
  const [activeAccounts, setActiveAccounts] = useShared(Settings, 'accounts');
  const [state, setState] = useState<ConnectionState>({ accounts: [] });

  const newContext = (() => {
    // Reassign properties of Context but do not recreate it
    let context: Context;
    return (s: ConnectionState): Context =>
      (context = Object.assign(
        context || {
          connect: () => makeRequest({ type: 'connect' }),
          reload: () => makeRequest({ type: 'reload' }),
          login: (account: Context.Account) =>
            makeRequest({ type: 'login', account }),
          disconnect,
          canConnect: true,
        },
        {
          connected: !!s.driver,
          ...s,
        },
      ));
  })();

  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [request, setRequest] = useState<ActionRequest>(
    new ActionRequest({ type: 'init' }),
  );

  const makeRequest = (action: Action) => {
    const r = new ActionRequest(action);
    setRequest(r);
    return r.result;
  };

  const showModal = <T extends unknown>(
    props: Omit<ModalOptions<T>, 'resolve'>,
  ) => {
    return new Promise<T>((r) =>
      setModal({
        ...props,
        resolve: r,
      }),
    );
  };

  const connect = async ({
    mounted,
    connected,
    activeAccounts,
    driver,
    dataStore,
    linked,
    onlineStore,
    accounts,
  }: ConnectionState & SharedState & { mounted(): boolean }): Promise<
    [ConnectionState, SharedState, boolean]
  > => {
    const packState = (
      ok: boolean,
    ): [ConnectionState, SharedState, boolean] => [
      {
        driver,
        dataStore,
        linked,
        onlineStore,
        accounts,
      },
      {
        connected,
        activeAccounts,
      },
      ok,
    ];

    // [Page load] Don't prompt the user to unlock the wallet
    if (request.action.type === 'init' && window.ethereum?.isMetaMask) {
      if (!(await window.ethereum._metamask.isUnlocked())) {
        return packState(false);
      }
    }

    if (!mounted()) {
      return packState(false);
    }

    // [Page load] Don't prompt the user to select a driver
    if (request.action.type === 'init' && !connected) {
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

        // case 'WalletConnect':
        //   const provider = await walletConnect?.connect({
        //     headless: request.action.type === 'init',
        //   });
        //   if (!provider) {
        //     return packState(false);
        //   }
        //   driver = new Driver(provider);
        //   break;

        default:
          throw new Error(`Invalid driver type ${connected}`);
      }
    }

    switch (request.action.type) {
      case 'connect':
        showModal({
          title: 'Connecting',
          children: Processing,
        });
        break;
      case 'login':
        showModal({
          title: 'Signing in',
          children: Processing,
        });
        break;
    }

    // Request permissions
    await driver.connect();

    // List accounts
    const ethAccounts = await driver.listAccounts();

    // Switch the chain to Accumulate
    await driver.switchChains(network);
    if (!mounted()) {
      return packState(false);
    }

    // Sync accounts
    for (const address of [...ethAccounts, ...activeAccounts]) {
      const lcaddr = address.toLowerCase();
      let account = accounts.find((x) => x.address.toLowerCase() == lcaddr);
      if (!account) {
        account = {
          exists: false,
          driver,
          address,
          liteIdentity: new LiteIdentity({
            url: EthPublicKey.liteFromHash(address),
          }),
        };
        accounts.push(account);
      }
    }

    // Load account data
    for (const account of accounts) {
      if (account.exists && request.action.type != 'reload') {
        continue;
      }
      const lda = await api
        .query(account.liteIdentity.url!)
        .catch(isErrorRecord);
      if (!mounted()) {
        return packState(false);
      }
      if (isRecordOf(lda, LiteIdentity)) {
        account.exists = true;
        account.liteIdentity = lda.account!;
      }
    }

    if (request.action.type === 'login') {
      const { account } = request.action;

      // Check for a known public key
      if (
        account.publicKey?.ethereum?.toLowerCase() !==
        account.address.toLowerCase()
      ) {
        const storedKey = Settings.getKey(account.address);
        if (storedKey) {
          account.publicKey = new EthPublicKey(storedKey);
        }
      }

      // Recover the public key
      if (!account.publicKey) {
        showModal({
          title: `Signing in with ${account.address}`,
          children: Processing,
        });
        const message = 'Login to Accumulate';
        const signature = await driver.signEthMessage(account.address, message);
        if (!mounted()) {
          return packState(false);
        }
        if (!signature) {
          return packState(false);
        }
        account.publicKey = EthPublicKey.recover(signature, message);
        if (
          account.publicKey.ethereum.toLowerCase() !==
          account.address.toLowerCase()
        ) {
          throw new Error('Failed to recover public key');
        }
        Settings.putKey(account.address, account.publicKey.publicKey);
      }
    }

    // Load linked accounts
    dataStore = new OfflineStore(Buffer.from('wallet', 'utf-8'));
    linked = await Linked.load(api, [
      ...accounts.map(
        (x): Store.Entry => ({
          type: 'link',
          accountType: 'identity',
          url: `${x.liteIdentity.url}`,
        }),
      ),
      ...dataStore,
    ]);

    return packState(true);
  };

  const disconnect = () => {
    // walletConnect?.disconnect();
    ReactDOM.unstable_batchedUpdates(() => {
      setModal(null);
      setConnected(null);
      setActiveAccounts([]);
      setState({ accounts: [] });
    });
    request?.reject(new Error('Disconnected'));
  };

  useEffect(() => {
    let mounted = true;

    if (!request || request.executed) {
      return;
    }

    connect({
      ...state,
      connected,
      activeAccounts,
      mounted: () => mounted,
    })
      .then((r) => {
        if (!mounted) {
          return;
        }

        const [state, { connected }, ok] = r;
        if (!ok && request.action.type === 'connect') {
          // If the user cancels an explicit connection request, reset
          disconnect();
        } else {
          ReactDOM.unstable_batchedUpdates(() => {
            setModal(null);
            setConnected(connected);
            setState(state);
          });
          request?.resolve(newContext(state));
        }
      })
      .catch((e: Error) => {
        console.error(e);
        if (request.action.type !== 'init') {
          showModal({
            title: 'Connect',
            children: () => <ShowError error={e} />,
          });
        }
        request?.reject(e);
      });

    return () => {
      mounted = false;
    };
  }, [
    request,
    connected,
    state.driver,
    network,
    activeAccounts.join('|'),
    state.accounts.map((x) => x.address).join('|'),
    walletConnect,
  ]);

  // Render
  return (
    <Provider value={newContext(state)}>
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
