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
import React, { useContext, useState } from 'react';
import { LuDatabaseBackup } from 'react-icons/lu';
import {
  RiAccountCircleLine,
  RiAddCircleFill,
  RiExternalLinkLine,
  RiQuestionLine,
} from 'react-icons/ri';
import { Link as RouterLink } from 'react-router-dom';

import { URL } from 'accumulate.js';
import { RecordRange, RecordType } from 'accumulate.js/lib/api_v3';
import {
  AccountType,
  DataEntryType,
  LiteDataAccount,
  LiteIdentity,
  Transaction,
  TransactionArgs,
} from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { tooltip } from '../../utils/lang';
import { TxnEntry, isRecordOfDataTxn } from '../../utils/types';
import { CreditAmount } from '../common/Amount';
import { Link } from '../common/Link';
import { Shared } from '../common/Network';
import { ShowError } from '../common/ShowError';
import { WithIcon } from '../common/WithIcon';
import { queryEffect, submitAndWait } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { AddCredits } from './AddCredits';
import { AddNote } from './AddNote';
import { Backup, Entry } from './Backup';
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

  const [openAddNote, setOpenAddNote] = useState(false);
  const [formAddNote] = Form.useForm();

  const [openAddCredits, setOpenAddCredits] = useState(false);
  const [formAddCredits] = Form.useForm();

  useAsyncEffect(
    async (mounted) => {
      const publicKey = Settings.getKey(account);
      if (!publicKey) {
        return;
      }

      const [lidUrl, backupUrl] = await Promise.all([
        liteIDForEth(publicKey),
        Backup.chainFor(publicKey),
      ]);
      if (!mounted()) {
        return;
      }

      setIdentityUrl(URL.parse(lidUrl));
      setBackupUrl(URL.parse(backupUrl));
    },
    [account],
  );

  const sign = async (args: TransactionArgs) => {
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

  const initBackups = async () => {
    const publicKey = Settings.getKey(account);
    if (!publicKey) {
      setError('Public key is not known');
      return;
    }
    await sign(await Backup.initialize(publicKey));
  };

  const addNote = async () => {
    const publicKey = Settings.getKey(account);
    if (!publicKey) {
      setError('Public key is not known');
      return;
    }

    const entry = await Backup.encrypt(account, {
      type: 'note',
      value: formAddNote.getFieldValue('value'),
    });

    await sign({
      header: {
        principal: await Backup.chainFor(publicKey),
      },
      body: {
        type: 'writeData',
        entry,
      },
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
      disabled: !Backup.supported,
      label: <WithIcon icon={LuDatabaseBackup}>Backup</WithIcon>,
      children: (
        <Dashboard.Backup
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
        />
      </div>
      <ShowError error={error} onClose={() => setError(null)} />

      <AddNote
        open={account && openAddNote}
        onCancel={() => setOpenAddNote(false)}
        onSubmit={() => addNote().finally(() => setOpenAddNote(false))}
        form={formAddNote}
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
}: {
  url: URL;
  addNote: () => any;
  initialize: () => any;
}) {
  const { account: eth } = useWeb3React();

  const [account, setAccount] = useState<LiteDataAccount>(null);
  const [missing, setMissing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [entries, setEntries] = useState<Entry[]>();

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

  const { api, onApiError } = useContext(Shared);
  useAsyncEffect(
    async (mounted) => {
      if (!account?.url) {
        return;
      }

      let start = 1;
      const entries = [];
      while (true) {
        const { records, total } = (await api.query(account?.url, {
          queryType: 'chain',
          name: 'main',
          range: {
            start: start,
            expand: true,
          },
        })) as RecordRange<TxnEntry>;
        if (!mounted()) {
          return;
        }
        if (!records?.length) {
          break;
        }

        for (const r of records) {
          if (!isRecordOfDataTxn(r)) {
            continue;
          }

          const { entry } = r.value.message.transaction.body;
          if (entry.type !== DataEntryType.DoubleHash) {
            continue;
          }

          const plain = await Backup.decrypt(eth, entry);
          if (!mounted()) {
            return;
          }
          entries.push(plain);
        }

        start += records.length;
        if (start >= total) {
          break;
        }
      }
      setEntries(entries);
    },
    [`${account?.url}`],
  ).catch(onApiError);

  const create = async () => {
    setCreating(true);
    await initialize();
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
            disabled={creating}
          >
            <WithIcon icon={RiAddCircleFill}>Create</WithIcon>
          </Button>
        </Text>
      }
    />
  );

  const Items = () => (
    <>
      {entries?.map((x, i) => <pre key={`${i}`}>{JSON.stringify(x)}</pre>)}
      <Button shape="round" type="primary" onClick={addNote}>
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
};
