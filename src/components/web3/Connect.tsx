import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { Button, List, Modal, ModalProps, Select, Skeleton } from 'antd';
import React, { useContext, useState } from 'react';

import { LiteIdentity } from 'accumulate.js/lib/core';

import { isRecordOf } from '../../utils/types';
import { Network } from '../common/Network';
import { useShared } from '../common/Shared';
import { isErrorRecord } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { Provider } from './Context';
import { Driver, EthPublicKey } from './Driver';
import { Linked } from './Linked';
import { OfflineStore } from './OfflineStore';
import { OnlineStore } from './OnlineStore';
import { Settings } from './Settings';
import { Store } from './Store';

export default Connect;

type Action = 'init' | 'connect' | 'switch' | 'reload';

interface ActionArgs {
  oldAccount?: string;
  mustLogIn?: boolean;
}

class ActionRequest {
  readonly action: Action;
  readonly args: ActionArgs;
  readonly result: Promise<boolean>;
  #resolve: (ok: boolean) => void;
  #executed = false;

  constructor(action: Action, args: ActionArgs = {}) {
    this.action = action;
    this.args = args;
    this.result = new Promise<boolean>((resolve) => {
      this.#resolve = (ok) => {
        resolve(ok);
        this.#executed = true;
      };
    });
  }

  resolve(ok: boolean) {
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

const SelectDriver = ({ resolve }: Resolver<typeof Settings.connected>) => (
  <div>
    <List>
      <List.Item>
        <Button
          block
          shape="round"
          size="large"
          disabled={!window.ethereum}
          children="MetaMask"
          onClick={() => resolve('Web3')}
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

export function Connect({ children }: { children: React.ReactNode }) {
  const { api, network } = useContext(Network);
  const { activate, deactivate } = useWeb3React();

  const [connected, setConnected] = useShared(Settings, 'connected');
  const [account, setAccount] = useShared(Settings, 'account');

  const [modal, setModal] = useState<ModalOptions>(null);
  const [request, setRequest] = useState<ActionRequest>(
    new ActionRequest('init'),
  );

  const [driver, setDriver] = useState<Driver>(null);
  const [pubKey, setPubKey] = useState<EthPublicKey>();
  const [liteIdentity, setLiteIdentity] = useState<LiteIdentity>();
  const [dataStore, setDataStore] = useState<Store>();
  const [onlineStore, setOnlineStore] = useState<OnlineStore>();
  const [linked, setLinked] = useState<Linked>();

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

  useAsyncEffect(
    async (mounted) => {
      if (!request || request.executed) {
        return;
      }
      if (
        request.action !== 'init' &&
        request.action !== 'connect' &&
        request.action !== 'switch'
      ) {
        return;
      }

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
        request.resolve(false);
        return;
      }

      // Select a driver
      if (!connected) {
        const connected = await showModal<typeof Settings.connected>({
          title: 'Connect',
          children: SelectDriver,
        });
        if (!mounted()) {
          return;
        }
        if (!connected) {
          request.resolve(false);
          setModal(null);
          return;
        }

        setConnected(connected);
        return; // -> React
      }

      if (!driver) {
        switch (connected) {
          case 'Web3':
            const driver = new Driver(window.ethereum);
            const connector = new InjectedConnector({});
            activate(connector);
            setDriver(driver);
            if (request.action !== 'init') {
              showModal({
                title: 'Logging in',
                children: Processing,
              });
            }
            return; // -> React

          default:
            throw new Error(`Invalid driver type ${connected}`);
        }
      }

      // Switch the chain to Accumulate and load accounts
      await driver.switchChains(network);
      const accounts = await driver.web3.eth.getAccounts();
      if (!mounted()) {
        return;
      }

      // If there's only one account, select it
      if (
        request.action !== 'switch' &&
        accounts.length === 1 &&
        account !== accounts[0]
      ) {
        setAccount(accounts[0]);
        return; // -> React
      }

      // [Page load] Don't prompt the user to select an account
      const didSelectAccount =
        request.args.oldAccount !== account &&
        account &&
        accounts.includes(account);
      if (request.action === 'init' && !didSelectAccount) {
        request.resolve(false);
        return;
      }

      // Select an account
      if (
        !didSelectAccount ||
        (request.args.mustLogIn && accounts.length > 1)
      ) {
        const account = await showModal<string>({
          title: 'Select an account',
          children: SelectAccount({ accounts }),
        });
        if (!mounted()) {
          return;
        }
        if (!account) {
          request.resolve(false);
          setModal(null);
          return;
        }

        request.args.mustLogIn = false;
        setAccount(account);
        return; // -> React
      }

      // Check for a known public key
      const didRecoverPubKey =
        pubKey?.ethereum &&
        pubKey.ethereum.toLowerCase() === account.toLowerCase();
      if (!didRecoverPubKey) {
        const storedKey = Settings.getKey(account);
        if (storedKey) {
          setPubKey(new EthPublicKey(storedKey));
          setRequest(new ActionRequest('reload'));
          setModal(null);
          request.resolve(true);
          return;
        }
      }

      // [Page load] Don't prompt the user to login
      if (request.action === 'init' && !didRecoverPubKey) {
        request.resolve(false);
        return;
      }

      // Recover the public key
      if (!didRecoverPubKey) {
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
          request.resolve(false);
          setModal(null);
          return;
        }

        const pubKey = EthPublicKey.recover(signature, message);
        if (pubKey.ethereum.toLowerCase() !== account.toLowerCase()) {
          throw new Error('Failed to recover public key');
        }

        Settings.putKey(account, pubKey.publicKey);
        setPubKey(pubKey);
        setRequest(new ActionRequest('reload'));
      }

      setModal(null);
      request.resolve(true);
    },
    [request, connected, driver, network, account, pubKey?.ethereum],
  ).catch((e) => {
    console.error(e);
    request?.resolve(false);
  });

  // Load account data
  const loadLiteIdentity = async (mounted: () => boolean) => {
    const r = await api.query(pubKey.lite).catch(isErrorRecord);
    if (!mounted()) {
      return;
    }
    if (isRecordOf(r, LiteIdentity)) {
      setLiteIdentity(r.account);
    }
  };

  const loadDataStore = async (mounted: () => boolean) => {
    const online = new OnlineStore(driver, pubKey);
    setOnlineStore(online);

    await online.load(api).catch((err) => {
      console.error(err);
    });
    if (!mounted()) {
      return;
    }

    const store = online.enabled ? online : new OfflineStore(pubKey.publicKey);
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
  };

  useAsyncEffect(
    async (mounted) => {
      if (request?.action !== 'reload' || request.executed || !pubKey) {
        return;
      }

      await Promise.all([loadLiteIdentity(mounted), loadDataStore(mounted)]);
      request.resolve(true);
    },
    [`${pubKey?.lite}`, request],
  ).catch((e) => {
    console.error(e);
    request?.resolve(false);
  });

  // Render
  return (
    <Provider
      value={{
        connect: () =>
          makeRequest('connect', {
            mustLogIn: !(account && Settings.getKey(account)),
          }),
        switch: () => makeRequest('switch', { oldAccount: account }),
        reload: () => makeRequest('reload'),

        disconnect() {
          deactivate();
          request?.resolve(false);
          setModal(null);

          setConnected(null);
          setAccount(null);

          setDriver(null);
          setPubKey(null);
        },

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

      {modal && (
        <Modal
          {...modal}
          open={!!modal}
          footer={false}
          onCancel={() => modal.resolve()}
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
