import { Descriptions, Tooltip, Typography } from 'antd';
import moment from 'moment';
import React, { useState } from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine, RiQuestionLine } from 'react-icons/ri';

import { TxID, URL } from 'accumulate.js';
import { AccountRecord } from 'accumulate.js/lib/api_v3';
import { AccountType } from 'accumulate.js/lib/core';

import { AccTitle } from '../../common/AccTitle';
import { EnumValue } from '../../common/EnumValue';
import { Link } from '../../common/Link';
import { Nobr } from '../../common/Nobr';
import { RawData } from '../../common/RawData';
import tooltipDescs from '../../common/TooltipDescriptions';
import { Settings } from '../Settings';
import { AccChains } from './AccChains';
import Authorities from './Authorities';
import { DataAccount } from './DataAccount';
import { Identity } from './Identity';
import { KeyBook } from './KeyBook';
import { KeyPage } from './KeyPage';
import { TokenAccount } from './TokenAccount';
import { TokenIssuer } from './TokenIssuer';
import { describeParent } from './parent';

const { Title } = Typography;

export function Account({ record }: { record: AccountRecord }) {
  const [rawDataDisplay, setRawDataDisplay] = useState(false);

  return (
    <div>
      <Show record={record} />

      {Settings.enableDevMode && (
        <div>
          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Raw Data
            <RawData.Toggle
              value={rawDataDisplay}
              onChange={setRawDataDisplay}
            />
          </Title>

          <RawData
            data={record.asObject()}
            style={{ marginTop: 0, display: rawDataDisplay ? 'block' : 'none' }}
          />
        </div>
      )}
    </div>
  );
}

function Show({ record }: { record: AccountRecord }) {
  switch (record.account.type) {
    case AccountType.LiteIdentity:
    case AccountType.Identity:
      return <Identity record={record} />;

    case AccountType.LiteTokenAccount:
    case AccountType.TokenAccount:
      return <TokenAccount record={record} />;

    case AccountType.LiteDataAccount:
    case AccountType.DataAccount:
      return <DataAccount record={record} />;

    case AccountType.TokenIssuer:
      return <TokenIssuer record={record} />;

    case AccountType.KeyPage:
      return <KeyPage record={record} />;

    case AccountType.KeyBook:
      return <KeyBook record={record} />;

    default:
      return <Account.Generic record={record} />;
  }
}

Account.Generic = function ({ record }: { record: AccountRecord }) {
  // This is a hack to make it easier to check sequences
  const { account } = record;
  switch (account.type) {
    case AccountType.SyntheticLedger:
    case AccountType.AnchorLedger:
      for (const s of account.sequence) {
        if (s.url.path === '' || s.url.path === '/') {
          s.url = s.url.join(account.url.path);
        }
      }
      break;
  }

  const labelURL = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.acctUrl}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Account URL
      </Nobr>
    </span>
  );

  const accountObj = account.asObject();
  return (
    <div>
      <AccTitle title="Account" url={account.url} />

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
        Account Info
      </Title>
      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label={labelURL}>
          {account.url.toString()}
        </Descriptions.Item>

        {describeParent(account)}
      </Descriptions>

      {/* Other properties */}
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Properties
      </Title>
      <Descriptions bordered column={1} size="middle" className="info-table">
        {Object.entries(account).map(([key, value]) => {
          if (key === 'type' || key === 'url') {
            return null;
          }
          return describeProperty({ key, value, obj: accountObj });
        })}
      </Descriptions>

      {/* Authorities (may be inherited) */}
      <Authorities account={account} />

      {/* Chains and pending transactions */}
      <AccChains account={account.url} />
    </div>
  );
};

function describeProperty({
  label,
  key,
  value,
  obj,
}: {
  label?: string;
  key: string | number;
  value: any;
  obj: any;
}) {
  obj = obj[key];
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    if (typeof obj === 'string') {
      return describe(label, key, humanName(obj));
    }

    return describe(label, key, value);
  }

  if (typeof value !== 'object') {
    return describe(label, key, value);
  }

  if (value instanceof Date) {
    return describe(label, key, moment(value).format('YYYY-MM-DD HH:mm:ss'));
  }

  if (value instanceof URL || value instanceof TxID) {
    return describe(label, key, <Link to={value}>{value.toString()}</Link>);
  }

  if (value instanceof Array) {
    // Arrays
    return value.map((value, i) =>
      describeProperty({
        label: `${key} #${i + 1}`,
        key: i,
        value,
        obj,
      }),
    );
  }

  return Object.entries(value).map(([name, value]) =>
    describeProperty({
      label: `${label} ${name}`,
      key: name,
      value,
      obj,
    }),
  );
}

function describe(
  label: string,
  name: string | number,
  children: React.ReactNode,
) {
  return (
    <Descriptions.Item
      key={name}
      label={humanName(label || `${name}`)}
      children={children}
    />
  );
}

function humanName(s: string) {
  return s.replace(/(\b[a-z]|[a-z][A-Z])/g, (s) => {
    if (s.length == 1) {
      return s.toUpperCase();
    }
    return s.substring(0, 1) + ' ' + s.substring(1);
  });
}
