import {
  DisconnectOutlined,
  LinkOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  List,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountBoxLine,
  RiAddCircleFill,
  RiQuestionLine,
} from 'react-icons/ri';
import { useHistory } from 'react-router-dom';

import { URLArgs } from 'accumulate.js';
import { TransactionArgs } from 'accumulate.js/lib/core';

import tooltip from '../../utils/lang';
import { CreditAmount } from '../common/Amount';
import { InfoTable } from '../common/InfoTable';
import { Link } from '../common/Link';
import { Shared } from '../common/Network';
import { useShared } from '../common/Shared';
import { WithIcon } from '../common/WithIcon';
import { Settings as MainSettings } from '../explorer/Settings';
import { AddCredits } from '../form/AddCredits';
import { AddNote } from '../form/AddNote';
import { CreateIdentity } from '../form/CreateIdentity';
import { Sign } from '../form/Sign';
import { MissingLiteID } from './MissingLiteID';
import { Settings } from './Settings';
import { useWeb3 } from './useWeb3';

const { Title, Text, Paragraph } = Typography;

export function Dashboard() {
  const account = useWeb3();
  const history = useHistory();
  const { api } = useContext(Shared);
  const [connected] = useShared(Settings, 'connected');
  const [linked] = useShared(account, 'linked');
  const linkedAccounts = linked?.direct?.filter(
    (x) => !account.liteIdUrl.equals(x.url),
  );

  const [open, setOpen] = useState<
    'addCredits' | 'addNote' | 'createIdentity'
  >();
  const [toSign, setToSign] = useState<Sign.Request>();
  const sign = (txn: TransactionArgs, signer?: Sign.Signer) =>
    Sign.submit(setToSign, txn, signer);

  const [enablingBackups, setEnablingBackups] = useState(false);
  const enableBackups = async () => {
    setEnablingBackups(true);
    try {
      await account.online.setup(api, sign);
    } finally {
      setEnablingBackups(false);
    }
  };

  const unlink = async (url: URLArgs) => {
    const ok = await account.store.add((txn) => Sign.submit(setToSign, txn), {
      type: 'unlink',
      url: `${url}`,
    });
    if (!ok) {
      return;
    }
    await account.reload(api, 'entries', 'linked');
  };

  useEffect(() => {
    if (!connected) {
      history.push('/');
    }
  }, [connected]);

  if (!connected) {
    return false;
  }

  const title = <Title level={2}>Web3 Wallet</Title>;
  if (!account) {
    return (
      <>
        {title}

        <Skeleton />
      </>
    );
  }

  return (
    <>
      {title}

      <InfoTable>
        <Descriptions.Item
          label={
            <WithIcon
              icon={RiQuestionLine}
              tooltip={tooltip.web3.ethereumAddress}
              children="Ethereum Address"
            />
          }
        >
          <Text copyable>{account.publicKey.ethereum}</Text>
        </Descriptions.Item>

        <Descriptions.Item
          label={
            <WithIcon
              icon={RiQuestionLine}
              tooltip={tooltip.web3.liteIdentity}
              children="Lite Identity"
            />
          }
        >
          <Text copyable={{ text: `${account.liteIdUrl}` }}>
            {account.liteIdentity ? (
              <Link to={account.liteIdUrl}>{`${account.liteIdUrl}`}</Link>
            ) : (
              `${account.liteIdUrl}`
            )}
          </Text>
        </Descriptions.Item>

        {account.liteIdentity && (
          <Descriptions.Item
            label={
              <WithIcon
                icon={RiQuestionLine}
                tooltip={tooltip.creditBalance}
                children="Credits"
              />
            }
          >
            {account.liteIdentity.creditBalance ? (
              <CreditAmount amount={account.liteIdentity.creditBalance} />
            ) : (
              <Button
                shape="round"
                type="primary"
                onClick={() => setOpen('addCredits')}
                children="Purchase"
              />
            )}
          </Descriptions.Item>
        )}
      </InfoTable>

      {!account?.liteIdentity && (
        <Alert
          type="warning"
          style={{ marginBottom: 20 }}
          message={
            <MissingLiteID.Create
              eth={account.publicKey.ethereum}
              lite={account.liteIdUrl}
            />
          }
        />
      )}

      <Title level={4}>
        <WithIcon
          after
          icon={RiQuestionLine}
          tooltip={tooltip.web3.linkedSection}
        >
          Linked Accumulate Accounts
        </WithIcon>
      </Title>

      <Paragraph>
        <Button
          shape="round"
          type="primary"
          onClick={() => setOpen('createIdentity')}
          children="Create ADI"
        />
      </Paragraph>

      {!linkedAccounts ? (
        <Skeleton />
      ) : !linkedAccounts.length ? (
        <Alert
          type="info"
          message={
            <span>
              {'To link an account, navigate to it and click '}
              <LinkOutlined />
            </span>
          }
        />
      ) : (
        <List
          size="small"
          bordered
          dataSource={linkedAccounts}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Tooltip
                  overlayClassName="explorer-tooltip"
                  title={tooltip.web3.unlink}
                >
                  <DisconnectOutlined
                    style={{ cursor: 'pointer' }}
                    onClick={() => unlink(item.url)}
                  />
                </Tooltip>,
              ]}
            >
              <Link to={item.url}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiAccountBoxLine />
                </IconContext.Provider>
                {`${item.url}`}
              </Link>
            </List.Item>
          )}
        />
      )}

      <Title level={4} style={{ marginTop: 20 }}>
        On-chain Backup{' '}
      </Title>

      <InfoTable>
        <Descriptions.Item
          label={
            <WithIcon
              icon={RiQuestionLine}
              tooltip={tooltip.web3.backup}
              children="Data Account"
            />
          }
        >
          <Text copyable={{ text: `${account.online.url}` }}>
            {account.online.account ? (
              <Link to={account.online.url}>{`${account.online.url}`}</Link>
            ) : (
              `${account.online.url}`
            )}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item
          label={
            <WithIcon
              icon={RiQuestionLine}
              children="Status"
              tooltip={
                account.online.account
                  ? tooltip.web3.backupsEnabled
                  : tooltip.web3.backupsDisabled
              }
            />
          }
        >
          {account.online.account ? (
            <Tag color="blue">enabled</Tag>
          ) : (
            <Tooltip
              overlayClassName="explorer-tooltip"
              title={
                account.liteIdentity
                  ? 'Purchase credits to enable this action'
                  : 'Create the lite identity and purchase credits to enable this action'
              }
            >
              <Button
                shape="round"
                type="primary"
                onClick={enableBackups}
                disabled={
                  enablingBackups || !account?.liteIdentity?.creditBalance
                }
                children="Enable"
              />
            </Tooltip>
          )}
        </Descriptions.Item>
      </InfoTable>

      {MainSettings.enableDevMode && (
        <Button
          shape="round"
          type="primary"
          style={{ marginBottom: 20 }}
          disabled={!account.online.canEncrypt}
          onClick={() => setOpen('addNote')}
        >
          <WithIcon icon={RiAddCircleFill}>Add note</WithIcon>
        </Button>
      )}

      {/* Modals */}
      <Sign request={toSign} />

      {open === 'addCredits' && (
        <AddCredits
          to={account?.liteIdUrl}
          open={open === 'addCredits'}
          onCancel={() => setOpen(null)}
          onFinish={(ok) => {
            if (ok) {
              try {
                account.reload(api, 'liteIdentity');
              } finally {
                setOpen(null);
              }
            }
          }}
        />
      )}

      {open === 'addNote' && (
        <AddNote
          open={open === 'addNote'}
          onCancel={() => setOpen(null)}
          onFinish={(ok) => ok && setOpen(null)}
        />
      )}

      {open === 'createIdentity' && (
        <CreateIdentity
          open={open === 'createIdentity'}
          onCancel={() => setOpen(null)}
          onFinish={(ok) => ok && setOpen(null)}
        />
      )}
    </>
  );
}
