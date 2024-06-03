import { CloseOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { useWeb3React } from '@web3-react/core';
import {
  Alert,
  Button,
  Divider,
  List,
  Skeleton,
  Tabs,
  TabsProps,
  Typography,
} from 'antd';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { LuDatabaseBackup } from 'react-icons/lu';
import {
  RiAccountBoxLine,
  RiAccountCircleLine,
  RiAddCircleFill,
  RiExternalLinkLine,
  RiLink,
  RiQuestionLine,
  RiStackLine,
} from 'react-icons/ri';
import { Link as RouterLink } from 'react-router-dom';

import { Transaction, TransactionArgs } from 'accumulate.js/lib/core';

import { tooltip } from '../../utils/lang';
import { CreditAmount } from '../common/Amount';
import { CompactList } from '../common/CompactList';
import { Link } from '../common/Link';
import { Shared } from '../common/Network';
import { ShowError } from '../common/ShowError';
import { WithIcon } from '../common/WithIcon';
import { submitAndWait } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { Account } from './Account';
import { AddCredits } from './AddCredits';
import { AddNote } from './AddNote';
import { Settings } from './Settings';
import { Wallet } from './Wallet';
import { isLedgerError } from './utils';

const { Title, Paragraph, Text } = Typography;

export function Dashboard() {
  const { api } = useContext(Shared);
  const [error, setError] = useState<any>();

  const { account: eth, deactivate } = useWeb3React();
  const [account, setAccount] = useState<Account>();

  const [openAddNote, setOpenAddNote] = useState(false);
  const [openAddCredits, setOpenAddCredits] = useState(false);

  // If an account is connected at 'boot' but we don't know the public key,
  // disconnect
  useEffect(() => {
    if (!eth) {
      return;
    }
    if (!Wallet.connected) {
      Settings.dashboardOpen = false;
    } else if (!Settings.getKey(eth)) {
      Settings.dashboardOpen = false;
      Wallet.disconnect();
      deactivate();
    }
  }, [eth]);

  useAsyncEffect(
    async (mounted) => {
      if (!eth) {
        return;
      }

      // Load or get the public key
      let publicKey = Settings.getKey(eth);
      if (!publicKey) {
        try {
          setError(null);
          publicKey = await Wallet.login(eth);
          Settings.putKey(eth, publicKey);
        } catch (error) {
          setError(isLedgerError(error));
          deactivate();
          Wallet.disconnect();
          Settings.dashboardOpen = false;
          return;
        }
      }

      const account = Account.for(publicKey);
      await account.load(api);
      if (!mounted()) {
        return;
      }

      setAccount(account);
    },
    [eth],
  ).catch(setError);

  const sign = async (args: TransactionArgs) => {
    setError(null);

    try {
      const txn = new Transaction(args);
      const sig = await Wallet.signAccumulate(txn, {
        publicKey: account.publicKey,
        signerVersion: 1,
        timestamp: Date.now(),
        signer: account.liteIdUrl,
      });
      if (!sig?.signature) {
        return false;
      }

      await submitAndWait(api, {
        transaction: [txn],
        signatures: [sig],
      });
      return true;
    } catch (error) {
      setError(isLedgerError(error));
      return false;
    }
  };

  const initBackups = async () => {
    try {
      if (!account.backupAccount) {
        if (!(await account.initialize(sign))) {
          return;
        }
        await account.load(api);
      }
      if (!account.canEncrypt) {
        if (!(await account.generateKey(sign))) {
          return;
        }
        await account.load(api);
      }
      setAccount(account);
    } catch (error) {
      setError(isLedgerError(error));
    }
  };

  const didAddCredits = async () => {
    await account.reloadLiteIdentity(api);

    // Trigger refresh
    const b = account;
    setAccount(null);
    setAccount(b);
  };

  const Loading = () => (
    <Skeleton
      className={'skeleton-singleline'}
      active
      title={true}
      paragraph={false}
    />
  );

  const tabs: TabsProps['items'] = [
    {
      key: 'account',
      label: <WithIcon icon={RiAccountCircleLine}>Account</WithIcon>,
      children: !account ? (
        <Loading />
      ) : (
        <Dashboard.Identity
          account={account}
          addCredits={() => (setError(null), setOpenAddCredits(true))}
        />
      ),
    },
    {
      key: 'backup',
      disabled: !Account.supported,
      label: <WithIcon icon={LuDatabaseBackup}>Backup</WithIcon>,
      children: !account ? (
        <Loading />
      ) : (
        <Dashboard.Backup
          account={account}
          initialize={initBackups}
          addNote={() => (setError(null), setOpenAddNote(true))}
        />
      ),
    },
    {
      key: 'books',
      label: <WithIcon icon={RiLink}>Linked</WithIcon>,
      children: !account ? (
        <Loading />
      ) : (
        <Dashboard.Registered account={account} />
      ),
    },
  ];

  return (
    <div className="web3-module connected">
      <div className="account">
        <Tabs
          className="card-container"
          defaultActiveKey="account"
          type="card"
          items={tabs}
          tabBarExtraContent={
            <CloseOutlined
              style={{ cursor: 'pointer' }}
              onClick={() => (Settings.dashboardOpen = false)}
            />
          }
        />
      </div>

      <ShowError error={error} onClose={() => setError(null)} />

      <AddNote
        open={eth && openAddNote}
        onCancel={() => setOpenAddNote(false)}
        onFinish={() => setOpenAddNote(false)}
      />

      <AddCredits
        open={eth && openAddCredits}
        onCancel={() => setOpenAddCredits(false)}
        onFinish={() => didAddCredits().finally(() => setOpenAddCredits(false))}
      />
    </div>
  );
}

Dashboard.Identity = function ({
  account,
  addCredits,
}: {
  account: Account;
  addCredits: () => any;
}) {
  const { network } = useContext(Shared);

  const BridgeLink = ({ text }: { text: string }) => (
    <a
      href="https://bridge.accumulatenetwork.io/release"
      target="_blank"
      rel="noreferrer"
    >
      <strong>
        <WithIcon after icon={RiExternalLinkLine}>
          {text}
        </WithIcon>
      </strong>
    </a>
  );

  const FaucetLink = ({ text }: { text: string }) => (
    <RouterLink to={`/faucet/${account.liteIdUrl.toString()}`}>
      <strong>
        <WithIcon after icon={RiExternalLinkLine}>
          {text}
        </WithIcon>
      </strong>
    </RouterLink>
  );

  const NoLID = () => (
    <Alert
      type="warning"
      message={
        <Text>
          <strong>Lite Identity does not exist yet</strong>
          <br />
          To create a lite identity send ACME to{' '}
          <Text copyable={{ text: `${account.liteIdUrl.toString()}/ACME` }}>
            <Text mark>{`${account.liteIdUrl.toString()}/ACME`}</Text>
          </Text>
          <br />
          {network.mainnet ? (
            <>
              You can also <BridgeLink text="bridge WACME" /> from Ethereum or
              Arbitrum, using the above address as the destination.
            </>
          ) : (
            <>
              You can also use the <FaucetLink text="ACME faucet" />, using the
              above address as the destination.
            </>
          )}
        </Text>
      }
    />
  );

  const LIDInfo = () => (
    <Paragraph>
      <Title level={5}>
        <WithIcon after icon={RiQuestionLine} tooltip={tooltip.web3.credits}>
          Credit Balance
        </WithIcon>
      </Title>

      <CreditAmount amount={account.liteIdentity.creditBalance || 0} />
      <br />

      <Button shape="round" type="primary" onClick={addCredits}>
        <WithIcon icon={RiAddCircleFill}>Add credits</WithIcon>
      </Button>
    </Paragraph>
  );

  return (
    <>
      <Title level={5}>
        <WithIcon
          after
          icon={RiQuestionLine}
          tooltip={tooltip.web3.liteIdentity}
        >
          Accumulate Lite Identity
        </WithIcon>
      </Title>

      <Text copyable>
        {account ? (
          <Link to={account.liteIdUrl}>{account.liteIdUrl.toString()}</Link>
        ) : (
          account.liteIdUrl.toString()
        )}
      </Text>

      <Title level={5}>Ethereum Address</Title>

      <Text copyable>{account.ethereum}</Text>

      <Divider />

      {account.liteIdentity ? <LIDInfo /> : <NoLID />}
    </>
  );
};

Dashboard.Backup = function ({
  addNote,
  initialize,
  account,
}: {
  addNote: () => any;
  initialize: () => any;
  account: Account;
}) {
  const [creating, setCreating] = useState(false);

  const Create = () => (
    <Alert
      type="warning"
      message={
        <Text>
          <strong>Backups have not yet been initialized</strong>
          <br />
          <Button
            shape="round"
            type="primary"
            onClick={async () => {
              setCreating(true);
              await initialize();
              setCreating(false);
            }}
            disabled={creating}
          >
            <WithIcon icon={RiAddCircleFill}>Initialize</WithIcon>
          </Button>
        </Text>
      }
    />
  );

  return (
    <>
      <Title level={5}>
        <WithIcon after icon={RiQuestionLine} tooltip={tooltip.web3.backup}>
          Backup Account
        </WithIcon>
      </Title>

      <Paragraph>
        {account.backupAccount ? (
          <Link to={account.backupAccount.url}>
            {account.backupAccount.url.toString()}
          </Link>
        ) : (
          <Text>{account.backupAccount.toString()}</Text>
        )}

        <Divider />

        {creating ? (
          <Skeleton
            className={'skeleton-singleline'}
            active
            title={true}
            paragraph={false}
          />
        ) : !account.backupAccount || !account.canEncrypt ? (
          <Create />
        ) : (
          <Button shape="round" type="primary" onClick={addNote}>
            <WithIcon icon={RiAddCircleFill}>Add note</WithIcon>
          </Button>
        )}
      </Paragraph>
    </>
  );
};

Dashboard.Registered = function ({ account }: { account: Account }) {
  const NoAccounts = () => (
    <Alert
      type="info"
      message={
        <span>
          {'To register a key book, navigate to it and click '}
          <PlusCircleOutlined />
        </span>
      }
    />
  );

  const ListAccounts = () => (
    <CompactList
      size="small"
      dataSource={account.registeredBooks}
      renderItem={(item) => (
        <List.Item>
          <Link to={item}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiAccountBoxLine />
            </IconContext.Provider>
            {item.toString()}
          </Link>
        </List.Item>
      )}
    />
  );

  return (
    <>
      <Title level={5}>
        <WithIcon
          after
          icon={RiQuestionLine}
          tooltip={tooltip.web3.registeredTab}
        >
          Linked Accumulate Accounts
        </WithIcon>
      </Title>

      {account.registeredBooks?.length ? <ListAccounts /> : <NoAccounts />}
    </>
  );
};
