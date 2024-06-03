import { CloseOutlined } from '@ant-design/icons';
import { useWeb3React } from '@web3-react/core';
import {
  Alert,
  Button,
  Divider,
  Form,
  Skeleton,
  Tabs,
  TabsProps,
  Typography,
} from 'antd';
import React, { useContext, useEffect, useState } from 'react';
import { LuDatabaseBackup } from 'react-icons/lu';
import {
  RiAccountCircleLine,
  RiAddCircleFill,
  RiExternalLinkLine,
  RiQuestionLine,
} from 'react-icons/ri';
import { Link as RouterLink } from 'react-router-dom';

import { URL } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import {
  AccountType,
  LiteIdentity,
  Transaction,
  TransactionArgs,
} from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { tooltip } from '../../utils/lang';
import { CreditAmount } from '../common/Amount';
import { Link } from '../common/Link';
import { Shared } from '../common/Network';
import { ShowError } from '../common/ShowError';
import { WithIcon } from '../common/WithIcon';
import { queryEffect, submitAndWait } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { Account } from './Account';
import { AddCredits } from './AddCredits';
import { AddNote } from './AddNote';
import { Settings } from './Settings';
import { Wallet } from './Wallet';
import { isLedgerError, liteIDForEth } from './utils';

const { Title, Paragraph, Text } = Typography;

export function Dashboard() {
  const { api } = useContext(Shared);
  const [error, setError] = useState<any>();

  const { account, deactivate } = useWeb3React();
  const [publicKey, setPublicKey] = useState<Uint8Array>();
  const [backup, setBackup] = useState<Account>();
  const [identityUrl, setIdentityUrl] = useState<URL>();
  const [backupUrl, setBackupUrl] = useState<URL>();

  const [openAddNote, setOpenAddNote] = useState(false);

  const [openAddCredits, setOpenAddCredits] = useState(false);
  const [formAddCredits] = Form.useForm();

  // If an account is connected at 'boot' but we don't know the public key,
  // disconnect
  useEffect(() => {
    if (!account) {
      return;
    }
    if (!Wallet.connected) {
      Settings.dashboardOpen = false;
    } else if (!Settings.getKey(account)) {
      Settings.dashboardOpen = false;
      Wallet.disconnect();
      deactivate();
    }
  }, [account]);

  useAsyncEffect(
    async (mounted) => {
      if (!account) {
        return;
      }

      // Load or get the public key
      let publicKey = Settings.getKey(account);
      if (!publicKey) {
        try {
          setError(null);
          publicKey = await Wallet.login(account);
          Settings.putKey(account, publicKey);
        } catch (error) {
          setError(isLedgerError(error));
          deactivate();
          Wallet.disconnect();
          Settings.dashboardOpen = false;
          return;
        }
      }

      const backup = Account.for(publicKey);
      const [_, lidUrl, backupUrl] = await Promise.all([
        backup.load(api),
        liteIDForEth(publicKey),
        backup.chain(),
      ]);
      if (!mounted()) {
        return;
      }

      setPublicKey(publicKey);
      setBackup(backup);
      setIdentityUrl(URL.parse(lidUrl));
      setBackupUrl(URL.parse(backupUrl));
    },
    [account],
  ).catch(setError);

  const sign = async (args: TransactionArgs) => {
    setError(null);

    try {
      const txn = new Transaction(args);
      const sig = await Wallet.signAccumulate(txn, {
        publicKey,
        signerVersion: 1,
        timestamp: Date.now(),
        signer: await liteIDForEth(publicKey),
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
      if (!backup.account) {
        if (!(await backup.initialize(sign))) {
          return;
        }
        await backup.load(api);
      }
      if (!backup.hasKey) {
        if (!(await backup.generateKey(sign))) {
          return;
        }
        await backup.load(api);
      }
      setBackup(backup);
    } catch (error) {
      setError(isLedgerError(error));
    }
  };

  const addNote = async ({ value }: AddNote.Fields) => {
    await backup.addEntry(sign, {
      type: 'note',
      value,
    });
  };

  const addCredits = async () => {
    await sign({
      header: {
        principal: formAddCredits.getFieldValue('tokenAccount'),
      },
      body: {
        type: 'addCredits',
        recipient: formAddCredits.getFieldValue('recipient'),
        amount: formAddCredits.getFieldValue('tokens'),
        oracle: formAddCredits.getFieldValue('oracle'),
      },
    });

    // Trigger refresh
    const u = identityUrl;
    setIdentityUrl(null);
    setIdentityUrl(u);
  };

  const tabs: TabsProps['items'] = [
    {
      key: 'account',
      label: <WithIcon icon={RiAccountCircleLine}>Account</WithIcon>,
      children: (
        <Dashboard.Identity
          url={identityUrl}
          addCredits={() => (setError(null), setOpenAddCredits(true))}
        />
      ),
    },
    {
      key: 'backup',
      disabled: !Account.supported,
      label: <WithIcon icon={LuDatabaseBackup}>Backup</WithIcon>,
      children: (
        <Dashboard.Backup
          backup={backup}
          url={backupUrl}
          initialize={initBackups}
          addNote={() => (setError(null), setOpenAddNote(true))}
        />
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
        open={account && openAddNote}
        onCancel={() => setOpenAddNote(false)}
        onSubmit={(v) => addNote(v).finally(() => setOpenAddNote(false))}
        children={<ShowError error={error} onClose={() => setError(null)} />}
      />

      <AddCredits
        open={account && openAddCredits}
        onCancel={() => setOpenAddCredits(false)}
        onSubmit={() => addCredits().finally(() => setOpenAddCredits(false))}
        form={formAddCredits}
        children={<ShowError error={error} onClose={() => setError(null)} />}
      />
    </div>
  );
}

Dashboard.Identity = function ({
  url: url,
  addCredits,
}: {
  url: URL;
  addCredits: () => any;
}) {
  const { network } = useContext(Shared);
  const [account, setAccount] = useState<LiteIdentity>(null);
  const [missing, setMissing] = useState(false);
  const { account: eth } = useWeb3React();

  queryEffect(url).then((r) => {
    if (r.recordType === RecordType.Error) {
      setMissing(r.value.code === Status.NotFound);
      return;
    }
    if (r.recordType !== RecordType.Account) {
      return;
    }
    if (r.account.type !== AccountType.LiteIdentity) {
      return;
    }
    setAccount(r.account);
  });

  if (!url) {
    return (
      <Skeleton
        className={'skeleton-singleline'}
        active
        title={true}
        paragraph={false}
      />
    );
  }

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
    <RouterLink to={`/faucet/${url.toString()}`}>
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
          <Text copyable={{ text: `${url.toString()}/ACME` }}>
            <Text mark>{`${url.toString()}/ACME`}</Text>
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

      <CreditAmount amount={account.creditBalance || 0} />
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
          <Link to={account.url}>{account.url.toString()}</Link>
        ) : (
          url.toString()
        )}
      </Text>

      <Title level={5}>Ethereum Address</Title>

      <Text copyable>{eth}</Text>

      <Divider />

      {missing ? (
        <NoLID />
      ) : account ? (
        <LIDInfo />
      ) : (
        <Skeleton
          className={'skeleton-singleline'}
          active
          title={true}
          paragraph={false}
        />
      )}
    </>
  );
};

Dashboard.Backup = function ({
  url,
  addNote,
  initialize,
  backup,
}: {
  url: URL;
  addNote: () => any;
  initialize: () => any;
  backup: Account;
}) {
  const [creating, setCreating] = useState(false);

  const doInit = async () => {
    setCreating(true);
    await initialize();
    setCreating(false);
  };

  if (!backup) {
    return (
      <Skeleton
        className={'skeleton-singleline'}
        active
        title={true}
        paragraph={false}
      />
    );
  }

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
            onClick={doInit}
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
        {backup.account ? (
          <Link to={backup.account.url}>{backup.account.url.toString()}</Link>
        ) : (
          <Text>{url.toString()}</Text>
        )}

        <Divider />

        {creating ? (
          <Skeleton
            className={'skeleton-singleline'}
            active
            title={true}
            paragraph={false}
          />
        ) : !backup.account || !backup.hasKey ? (
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
