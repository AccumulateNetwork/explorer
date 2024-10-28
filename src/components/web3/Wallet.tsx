import { DisconnectOutlined, LinkOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
  List,
  Skeleton,
  Tooltip,
  Typography,
} from 'antd';
import React, { useState } from 'react';
import { IconContext } from 'react-icons';
import { RiAccountBoxLine, RiQuestionLine } from 'react-icons/ri';

import { URLArgs, core } from 'accumulate.js';
import { LiteIdentity } from 'accumulate.js/lib/core';

import tooltip from '../../utils/lang';
import { CreditAmount } from '../common/Amount';
import { InfoTable } from '../common/InfoTable';
import { Link } from '../common/Link';
import { WithIcon } from '../common/WithIcon';
import { CreateIdentity } from '../form/CreateIdentity';
import { useWeb3 } from './Context';
import { MissingLiteID } from './MissingLiteID';

const { Title } = Typography;

export function Wallet() {
  const web3 = useWeb3();
  const [open, setOpen] = useState<'createIdentity'>();
  const linkedAccounts = web3.linked?.direct?.filter(
    (x) => !(x instanceof LiteIdentity),
  );

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

  const labelETH = (
    <WithIcon
      icon={RiQuestionLine}
      tooltip={tooltip.web3.ethereumAddress}
      children="Ethereum Address"
    />
  );

  const labelBalance = (
    <WithIcon
      icon={RiQuestionLine}
      tooltip={tooltip.creditBalance}
      children="Credit Balance"
    />
  );

  return (
    <>
      <Title>Wallet</Title>

      {!web3.connected && (
        <Button
          block
          shape="round"
          size="large"
          onClick={() => web3.connect()}
          style={{ width: 'initial' }}
        >
          Connect
        </Button>
      )}

      {web3.accounts.map((account) => (
        <div key={account.address}>
          <Title level={4}>
            <Link to={account.liteIdentity.url}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiAccountBoxLine />
              </IconContext.Provider>
              {`${account.liteIdentity.url}`}
            </Link>
          </Title>

          <InfoTable>
            <Descriptions.Item label={labelETH}>
              {account.address}
            </Descriptions.Item>

            <Descriptions.Item label={labelBalance}>
              {account.exists ? (
                <CreditAmount
                  amount={account.liteIdentity.creditBalance || 0}
                />
              ) : (
                <Alert
                  type="warning"
                  message={
                    <MissingLiteID.Create
                      message=""
                      eth={account.address}
                      lite={account.liteIdentity.url!}
                    />
                  }
                />
              )}
            </Descriptions.Item>
          </InfoTable>
        </div>
      ))}

      {web3.connected && (
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
        </>
      )}

      {/* Modals */}
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
