import { DisconnectOutlined, LinkOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
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
import { Network } from '../common/Network';
import { useShared } from '../common/Shared';
import { WithIcon } from '../common/WithIcon';
import { Settings as MainSettings } from '../explorer/Settings';
import { AddCredits } from '../form/AddCredits';
import { AddNote } from '../form/AddNote';
import { CreateIdentity } from '../form/CreateIdentity';
import { Sign } from '../form/Sign';
import { useWeb3 } from './Context';
import { MissingLiteID } from './MissingLiteID';
import { Settings } from './Settings';

const { Title, Text, Paragraph } = Typography;

export default Dashboard;

export function Dashboard() {
  const web3 = useWeb3();
  const history = useHistory();
  const { api } = useContext(Network);
  const linkedAccounts = web3.linked?.direct?.filter(
    (x) => !web3.publicKey?.lite?.equals(x.url),
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
      await web3.onlineStore.setup(api, sign);
    } finally {
      setEnablingBackups(false);
    }
  };

  const unlink = async (url: URLArgs) => {
    const ok = await web3.dataStore.add((txn) => Sign.submit(setToSign, txn), {
      type: 'unlink',
      url: `${url}`,
    });
    if (!ok) {
      return;
    }
    web3.reload({ dataStore: true });
  };

  const [connected] = useShared(Settings, 'connected');
  useEffect(() => {
    if (!connected) {
      history.push('/');
    }
  }, [connected]);

  if (!web3.connected) {
    return false;
  }

  return (
    <>
      <Title level={4}>
        <WithIcon
          icon={<LinkOutlined style={{ color: '#1890ff' }} />}
          tooltip={tooltip.web3.linkedSection}
        >
          Linked Accounts
        </WithIcon>
      </Title>

      {!linkedAccounts ? (
        <Skeleton />
      ) : !linkedAccounts.length ? (
        <>
          <Alert
            type="info"
            message={
              <span>
                {'To link an account, navigate to it and click '}
                <LinkOutlined />
                {'or '}
                <Button
                  shape="round"
                  size="small"
                  onClick={() => setOpen('createIdentity')}
                  children="Create an ADI"
                />
              </span>
            }
          />
        </>
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

      {/* <Title level={4} style={{ marginTop: 20 }}>
        On-chain Backup{' '}
      </Title>

      <InfoTable>
        {web3.onlineStore && (
          <Descriptions.Item
            label={
              <WithIcon
                icon={RiQuestionLine}
                tooltip={tooltip.web3.backup}
                children="Data Account"
              />
            }
          >
            <Text copyable={{ text: `${web3.onlineStore.url}` }}>
              {web3.onlineStore.account ? (
                <Link
                  to={web3.onlineStore.url}
                >{`${web3.onlineStore.url}`}</Link>
              ) : (
                `${web3.onlineStore.url}`
              )}
            </Text>
          </Descriptions.Item>
        )}

        <Descriptions.Item
          label={
            <WithIcon
              icon={RiQuestionLine}
              children="Status"
              tooltip={
                web3.onlineStore?.account
                  ? tooltip.web3.backupsEnabled
                  : tooltip.web3.backupsDisabled
              }
            />
          }
        >
          {web3.onlineStore?.account ? (
            <Tag color="blue">enabled</Tag>
          ) : (
            <Tooltip
              overlayClassName="explorer-tooltip"
              title={
                web3.liteIdentity
                  ? 'Purchase credits to enable this action'
                  : 'Create the lite identity and purchase credits to enable this action'
              }
            >
              <Button
                shape="round"
                type="primary"
                onClick={enableBackups}
                disabled={enablingBackups || !web3?.liteIdentity?.creditBalance}
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
          disabled={!web3.onlineStore?.enabled}
          onClick={() => setOpen('addNote')}
        >
          <WithIcon icon={RiAddCircleFill}>Add note</WithIcon>
        </Button>
      )} */}

      {/* Modals */}
      <Sign request={toSign} />

      {open === 'addCredits' && (
        <AddCredits
          to={web3.publicKey.lite}
          open={open === 'addCredits'}
          onCancel={() => setOpen(null)}
          onFinish={(ok) => {
            if (ok) {
              try {
                web3.reload({ liteIdentity: true });
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
