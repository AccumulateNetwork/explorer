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

type Action = 'init' | 'connect' | 'reload';

interface ActionArgs {
  // oldAccount?: string;
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
  dataStore?: Store;
  onlineStore?: OnlineStore;
  accounts: Context.Account[];
}

interface SharedState {
  connected: typeof Settings.connected;
  activeAccounts: string[];
}

export function Connect({ children }: { children: React.ReactNode }) {
  const { api, network } = useContext(Network);
  const [walletConnect] = useWalletConnect();
  const [connected, setConnected] = useShared(Settings, 'connected');
  const [activeAccounts, setActiveAccounts] = useShared(Settings, 'accounts');
  const [state, setState] = useState<ConnectionState>({ accounts: [] });

  const newContext = (s: ConnectionState): Context => ({
    connect: () =>
      makeRequest('connect', {
        mustLogIn: !s.accounts.some((x) => Settings.getKey(x.address)),
      }),
    reload: () => makeRequest('reload'),

    disconnect,
    canConnect: true,
    connected: s.accounts.some((x) => x.publicKey),
    ...s,
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
    activeAccounts,
    driver,
    dataStore,
    onlineStore,
    accounts,
  }: ConnectionState & SharedState & { mounted(): boolean }): Promise<
    (ConnectionState & SharedState & { ok: boolean }) | undefined
  > => {
    const packState = (ok: boolean) => ({
      connected,
      driver,
      dataStore,
      onlineStore,
      accounts,
      activeAccounts,
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
        showModal({
          title: 'Connecting',
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
      return;
    }

    // Sync accounts
    for (const address of [
      ...(await driver.listAccounts()),
      ...activeAccounts,
    ]) {
      const lcaddr = address.toLowerCase();
      let account = accounts.find((x) => x.address.toLowerCase() == lcaddr);
      if (!account) {
        account = {
          active: false,
          exists: false,
          address,
          liteIdentity: new LiteIdentity({
            url: EthPublicKey.liteFromHash(address),
          }),
        };
        accounts.push(account);
      }

      account.active = activeAccounts.some((x) => x.toLowerCase() == lcaddr);
    }

    if (accounts.length === 1) {
      // If there's only one account, activate it
      accounts[0].active = true;
    } else if (!accounts.some((x) => x.active)) {
      // [Page load] Don't prompt the user to select an account
      if (request.action === 'init') {
        return packState(false);
      }

      // Select an account
      if (request.args.mustLogIn) {
        const selected = await showModal<string>({
          title: 'Select an account',
          children: SelectAccount({ accounts: ethAccounts }),
        });
        if (!mounted() || !selected) {
          return packState(false);
        }
        const account = accounts.find(
          (x) => x.address.toLowerCase() === selected.toLowerCase(),
        );
        if (!account) {
          return packState(false);
        }
        account.active = true;
      }
    }

    // For each active account
    for (const account of accounts) {
      if (!account.active) return;

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

      // [Page load] Don't prompt the user to login
      if (request.action === 'init' && !account.publicKey) {
        account.active = false;
        continue;
      }

      // Recover the public key
      if (!account.publicKey) {
        showModal({
          title: 'Logging in',
          children: Processing,
        });

        const message = 'Login to Accumulate';
        const signature = await driver.signEthMessage(account.address, message);
        if (!mounted()) {
          return;
        }
        if (!signature) {
          account.active = false;
          continue;
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

      // Load account data
      const lda = await api.query(account.publicKey.lite).catch(isErrorRecord);
      if (!mounted()) {
        return;
      }
      if (isRecordOf(lda, LiteIdentity)) {
        account.exists = true;
        account.liteIdentity = lda.account;
      } else {
        // Use a placeholder so that the dashboard works
        account.exists = false;
        account.liteIdentity = new LiteIdentity({
          url: account.publicKey.lite,
        });
      }
    }
    if (!accounts.some((x) => x.active)) {
      return packState(false);
    }

    // Load linked accounts
    dataStore = new OfflineStore(Buffer.from('wallet', 'utf-8'));
    await Promise.all(
      accounts.map(
        async (x) =>
          (x.linked = await Linked.load(api, [
            {
              type: 'link',
              accountType: 'identity',
              url: `${x.publicKey.lite}`,
            },
            ...dataStore,
          ])),
      ),
    );

    return packState(true);
  };

  const disconnect = () => {
    walletConnect?.disconnect();
    request?.resolve(null);
    setModal(null);

    setConnected(null);
    setActiveAccounts([]);
    setState({ accounts: [] });
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
        if (!mounted || !r) {
          return;
        }
        const { connected, driver, dataStore, onlineStore, accounts, ok } = r;

        if (!ok && request.action === 'connect') {
          // If the user cancels an explicit connection request, reset
          disconnect();
        } else {
          const state = {
            driver,
            dataStore,
            onlineStore,
            accounts,
          };
          setModal(null);
          setConnected(connected);
          setActiveAccounts(
            accounts.filter((x) => x.active).map((x) => x.address),
          );
          setState(state);
          request?.resolve(newContext(state));
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
