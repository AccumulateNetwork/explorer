import { Descriptions, List, Tag, Tooltip, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountBoxLine,
  RiAccountCircleLine,
  RiCloseCircleLine,
  RiInformationLine,
  RiKey2Line,
  RiQuestionLine,
} from 'react-icons/ri';

import { core } from 'accumulate.js';
import { AccountRecord } from 'accumulate.js/lib/api_v3';
import { AccountType } from 'accumulate.js/lib/core';

import Count from '../../common/Count';
import { EnumValue } from '../../common/EnumValue';
import Key from '../../common/Key';
import { Link } from '../../common/Link';
import { Nobr } from '../../common/Nobr';
import tooltipDescs from '../../common/TooltipDescriptions';
import { AccChains } from './AccChains';
import { describeParent } from './parent';

const { Title, Paragraph, Text } = Typography;

export function KeyPage({ record }: { record: AccountRecord }) {
  if (!(record.account instanceof core.KeyPage))
    throw new Error('Wrong account type for component');
  const { account } = record;

  const labelURL = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.keyPageUrl}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Key Page URL
      </Nobr>
    </span>
  );

  const labelThreshold = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.threshold}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Threshold
      </Nobr>
    </span>
  );

  const labelBalance = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.creditBalance}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Credits
      </Nobr>
    </span>
  );

  return (
    <div>
      {/* Account type */}
      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label="Type">
          <EnumValue type={AccountType} value={account.type} />
        </Descriptions.Item>
      </Descriptions>

      {/* General info like the URL and ADI */}
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Key Page Info
      </Title>
      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label={labelURL}>
          {account.url.toString()}
        </Descriptions.Item>

        {describeParent(account)}

        {account.acceptThreshold ? (
          <Descriptions.Item label={labelThreshold}>
            {account.acceptThreshold}
          </Descriptions.Item>
        ) : null}

        <Descriptions.Item label={labelBalance}>
          {account.creditBalance ? account.creditBalance / 100 : 0} credits
        </Descriptions.Item>
      </Descriptions>

      {/* Key page entries */}
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiKey2Line />
        </IconContext.Provider>
        Keys
        <Count count={account.keys?.length || 0} />
      </Title>

      <KeyPage.Entries account={account} />

      {/* Transaction blacklist */}
      {<KeyPage.Blacklist account={account} />}

      {/* A key page does not have its own authority - it is always governed by the key book */}

      {/* Chains and pending transactions */}
      <AccChains account={account.url} />
    </div>
  );
}

KeyPage.Entries = function ({ account }: { account: core.KeyPage }) {
  if (!account.keys?.length) {
    return (
      <Paragraph>
        <Text type="secondary">No keys</Text>
      </Paragraph>
    );
  }
  return (
    <List
      size="small"
      bordered
      dataSource={account.keys}
      renderItem={(item) => (
        <List.Item>
          <KeyPage.Entry entry={item} />{' '}
        </List.Item>
      )}
      style={{ marginBottom: '30px' }}
    />
  );
};

KeyPage.Blacklist = function ({ account }: { account: core.KeyPage }) {
  if (!account.transactionBlacklist?.length) {
    return false;
  }
  return (
    <div>
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiCloseCircleLine />
        </IconContext.Provider>
        Transaction Blacklist
        <Count count={account.transactionBlacklist.length} />
      </Title>

      <List
        size="small"
        bordered
        dataSource={account.transactionBlacklist}
        renderItem={(item) => (
          <List.Item>
            <Tag color="volcano">{item}</Tag>
          </List.Item>
        )}
        style={{ marginBottom: '30px' }}
      />
    </div>
  );
};

KeyPage.Entry = function ({ entry }: { entry: core.KeySpec }) {
  return (
    <span>
      {entry.delegate ? (
        <span>
          <Tag color="green">Delegate</Tag>
          <Link to={entry.delegate}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiAccountBoxLine />
            </IconContext.Provider>
            {entry.delegate.toString()}
          </Link>
        </span>
      ) : null}
      {entry.delegate && entry.publicKeyHash ? <p></p> : null}
      {entry.publicKeyHash ? <Key keyHash={entry.publicKeyHash} /> : null}
    </span>
  );
};
