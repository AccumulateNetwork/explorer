import { Descriptions, Tag, Typography } from 'antd';
import moment from 'moment';
import React from 'react';

import { TxID, URL } from 'accumulate.js';
import { CreditRecipient, TokenRecipient } from 'accumulate.js/lib/core';

import { Outputs } from '../message/Outputs';
import { Amount, CreditAmount } from './Amount';
import { InfiniteList, SHORT_LIST_LIMIT } from './InfiniteList';
import { InfoTable } from './InfoTable';
import { Link } from './Link';

const { Text } = Typography;

export function describeProperty({
  label = '',
  key,
  value,
  obj,
}: {
  label?: string;
  key: string | number;
  value: any;
  obj: any;
}) {
  obj = obj?.[key];
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && typeof obj === 'string') {
    return describe(label, key, humanName(obj));
  }

  if (typeof value === 'boolean') {
    return describe(
      label,
      key,
      value ? <Tag color="blue">True</Tag> : <Tag color="default">False</Tag>,
    );
  }

  if (typeof value === 'bigint') {
    return describe(label, key, `${value}`);
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

  if (value instanceof Uint8Array) {
    return describe(
      label,
      key,
      <Text>{Buffer.from(value).toString('hex')}</Text>,
    );
  }

  if (value instanceof CreditRecipient) {
    return describe(label, key, <Outputs.Output {...value} credits />);
  }

  if (value instanceof TokenRecipient) {
    return describe(label, key, <Outputs.Output {...value} />);
  }

  if (value instanceof Array) {
    // Short arrays: inline as sibling <Descriptions.Item> rows (unchanged).
    if (value.length <= SHORT_LIST_LIMIT) {
      return value.map((v, i) =>
        describeProperty({
          label: `${key} #${i + 1}`,
          key: i,
          value: v,
          obj,
        }),
      );
    }

    // Long arrays: one <Descriptions.Item> wrapping an InfiniteList. Each
    // row is rendered in its own nested <InfoTable> so object elements still
    // show their sub-properties. Primitive elements are boxed into a single
    // "#N" row. Only BlockLedger.entries is known to reach this branch on
    // mainnet (#30 audit).
    return describe(
      label || `${key}`,
      key,
      <InfiniteList
        dataSource={value}
        rowKey={(_, i) => i}
        renderItem={(v, i) => (
          <InfoTable>
            {renderArrayItem({
              label: `${key} #${i + 1}`,
              index: i,
              value: v,
              obj,
            })}
          </InfoTable>
        )}
      />,
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

function renderArrayItem({
  label,
  index,
  value,
  obj,
}: {
  label: string;
  index: number;
  value: any;
  obj: any;
}) {
  // Object elements: recurse into each field so the nested <InfoTable>
  // shows one row per sub-property. Primitive elements: render a single
  // "#N" row labelled with the parent key.
  if (value !== null && typeof value === 'object' && !isLeafObject(value)) {
    return Object.entries(value).map(([name, v]) =>
      describeProperty({
        label: name,
        key: name,
        value: v,
        obj: obj?.[index],
      }),
    );
  }
  return describeProperty({ label, key: index, value, obj });
}

function isLeafObject(value: any): boolean {
  return (
    value instanceof Date ||
    value instanceof URL ||
    value instanceof TxID ||
    value instanceof Uint8Array ||
    value instanceof CreditRecipient ||
    value instanceof TokenRecipient ||
    value instanceof Array
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
