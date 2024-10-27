import { DisconnectOutlined, LinkOutlined } from '@ant-design/icons';
import { Alert, Button, List, Skeleton, Tooltip, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiAccountBoxLine } from 'react-icons/ri';
import { useHistory } from 'react-router-dom';

import { URLArgs } from 'accumulate.js';
import { LiteIdentity } from 'accumulate.js/lib/core';

import tooltip from '../../utils/lang';
import { Link } from '../common/Link';
import { useShared } from '../common/Shared';
import { WithIcon } from '../common/WithIcon';
import { CreateIdentity } from '../form/CreateIdentity';
import { Context, useWeb3 } from './Context';
import { Settings } from './Settings';

const { Title } = Typography;

export function Dashboard({ account }: { account: Context.Account }) {
  const web3 = useWeb3();
  const history = useHistory();
  const linkedAccounts = web3.linked?.direct?.filter(
    (x) => !(x instanceof LiteIdentity),
  );

  const [open, setOpen] = useState<'createIdentity'>();

  const unlink = async (url: URLArgs) => {
    const ok = await web3.dataStore.add({
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

      {/* Modals */}
      {open === 'createIdentity' && account.exists && (
        <CreateIdentity
          open={open === 'createIdentity'}
          onCancel={() => setOpen(null)}
          onFinish={(ok) => ok && setOpen(null)}
          signer={{
            signer: account.liteIdentity.url,
            signerVersion: 1,
            account: account.liteIdentity,
            key: account,
          }}
        />
      )}
    </>
  );
}
