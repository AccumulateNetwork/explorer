import { useWeb3React } from '@web3-react/core';
import {
  Alert,
  Button,
  Divider,
  Skeleton,
  Tabs,
  TabsProps,
  Typography,
} from 'antd';
import React, { useContext, useState } from 'react';
import { IconContext } from 'react-icons';
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
  LiteDataAccount,
  LiteIdentity,
  Transaction,
  TransactionArgs,
} from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { tooltip } from '../../utils/lang';
import { CreditAmount } from '../common/Amount';
import { Link } from '../common/Link';
import { Shared } from '../common/Network';
import { useShared } from '../common/Shared';
import { WithIcon } from '../common/WithIcon';
import { queryEffect, submitAndWait } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import {
  Backup as BackupValues,
  backupIsSupported,
  deriveBackupLDA,
  initializeBackupTxn,
} from './Backup';
import { Settings } from './Settings';
import { Wallet } from './Wallet';
import { isLedgerError, liteIDForEth } from './utils';

const { Title, Paragraph, Text } = Typography;

export function Dashboard() {
  const { account } = useWeb3React();
  const { api } = useContext(Shared);

  const [error, setError] = useState<any>();
  const [identityUrl, setIdentityUrl] = useState<URL>();
  const [backupUrl, setBackupUrl] = useState<URL>();

  useAsyncEffect(
    async (mounted) => {
      const publicKey = Settings.getKey(account);
      if (!publicKey) {
        return;
      }

      const [lidUrl, backupUrl] = await Promise.all([
        liteIDForEth(publicKey),
        deriveBackupLDA(publicKey),
      ]);
      if (!mounted()) {
        return;
      }

      setIdentityUrl(URL.parse(lidUrl));
      setBackupUrl(URL.parse(backupUrl));
    },
    [account],
  );

  const signAccumulate = async (args: TransactionArgs) => {
    setError(null);

    try {
      const publicKey = Settings.getKey(account);
      if (!publicKey) {
        setError('Cannot sign: missing public key');
        return;
      }

      const txn = new Transaction(args);
      const sig = await Wallet.signAccumulate(txn, {
        publicKey,
        signerVersion: 1,
        timestamp: Date.now(),
        signer: await liteIDForEth(publicKey),
      });
      if (!sig?.signature) {
        return;
      }

      await submitAndWait(api, {
        transaction: [txn],
        signatures: [sig],
      });
    } catch (error) {
      setError(isLedgerError(error));
    }
  };

  const tabs: TabsProps['items'] = [
    {
      key: 'account',
      label: <WithIcon icon={RiAccountCircleLine}>Account</WithIcon>,
      children: (
        <Identity
          url={identityUrl}
          addCredits={() => {
            throw new Error('TODO');
          }}
        />
      ),
    },
    {
      key: 'backup',
      disabled: !backupIsSupported(),
      label: <WithIcon icon={LuDatabaseBackup}>Backup</WithIcon>,
      children: (
        <Backup
          url={backupUrl}
          sign={signAccumulate}
          addNote={() => {
            throw new Error('TODO');
          }}
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
        />
      </div>
      {error && (
        <Alert
          type="error"
          message={
            typeof error === 'object' &&
            'message' in error &&
            typeof error.message === 'string'
              ? error.message
              : `${error}`
          }
          closable
          onClose={() => setError(null)}
        />
      )}
    </div>
  );
}

function Identity({
  url: url,
  addCredits,
}: {
  url: URL;
  addCredits: () => any;
}) {
  const { network } = useContext(Shared);
  const [account, setAccount] = useState<LiteIdentity>(null);
  const [missing, setMissing] = useState(false);

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

      <Paragraph>
        {account ? (
          <Link to={account.url}>{account.url.toString()}</Link>
        ) : (
          <Text>{url.toString()}</Text>
        )}

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
      </Paragraph>
    </>
  );
}

function Backup({
  url,
  sign,
  addNote,
}: {
  url: URL;
  sign: (_: TransactionArgs) => Promise<void>;
  addNote: () => any;
}) {
  const [account, setAccount] = useState<LiteDataAccount>(null);
  const [missing, setMissing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [entries, setEntries] = useShared(BackupValues, 'entries');
  const { account: eth } = useWeb3React();
  const publicKey = Settings.getKey(eth);

  queryEffect(url, null, [creating]).then((r) => {
    if (r.recordType === RecordType.Error) {
      setMissing(r.value.code === Status.NotFound);
      return;
    }
    setMissing(false);
    if (r.recordType !== RecordType.Account) {
      return;
    }
    if (r.account.type !== AccountType.LiteDataAccount) {
      return;
    }
    setAccount(r.account);
  });

  const create = async () => {
    setCreating(true);
    await sign(await initializeBackupTxn(publicKey));
    setCreating(false);
  };

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

  const Create = () => (
    <Alert
      type="warning"
      message={
        <Text>
          <strong>Backup account does not exist yet</strong>
          <br />
          <Button
            shape="round"
            type="primary"
            onClick={create}
            disabled={creating || !publicKey}
          >
            <WithIcon icon={RiAddCircleFill}>Create</WithIcon>
          </Button>
        </Text>
      }
    />
  );

  const Items = () => (
    <>
      {entries.map((x, i) => (
        <pre key={`${i}`}>{JSON.stringify(x)}</pre>
      ))}
      <Button
        shape="round"
        type="primary"
        onClick={() => setEntries([...entries, { type: 'note', value: 'foo' }])}
      >
        <WithIcon icon={RiAddCircleFill}>Add note</WithIcon>
      </Button>
    </>
  );

  return (
    <>
      <Title level={5}>
        <WithIcon after icon={RiQuestionLine} tooltip={tooltip.web3.backup}>
          Backup Account
        </WithIcon>
      </Title>

      <Paragraph>
        {account ? (
          <Link to={account.url}>{account.url.toString()}</Link>
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
        ) : missing ? (
          <Create />
        ) : (
          <Items />
        )}
      </Paragraph>
    </>
  );
}
