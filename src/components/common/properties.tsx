import { Descriptions, Typography } from 'antd';
import moment from 'moment';
import React from 'react';

import { TxID, URL } from 'accumulate.js';
import { CreditRecipient, TokenRecipient } from 'accumulate.js/lib/core';

import { Outputs } from '../message/Outputs';
import { CreditAmount } from './Amount';
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
