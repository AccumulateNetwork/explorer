import { Input, Select, Skeleton, Typography } from 'antd';
import { useEffect, useState } from 'react';
import React from 'react';

import { Address } from 'accumulate.js';
import { sha256 } from 'accumulate.js/lib/common';
import { SignatureType } from 'accumulate.js/lib/core';

import { Settings } from '../explorer/Settings';

const { Text } = Typography;

type DisplayTypeArg =
  | SignatureType
  | ReturnType<typeof SignatureType.getName>
  | 'hash'
  | 'plain';
type DisplayType = SignatureType | 'hash' | 'plain';

function parseType(type: DisplayTypeArg): DisplayType {
  if (typeof type === 'number') {
    return type;
  }
  if (type === 'hash' || type === 'plain') {
    return type;
  }
  return SignatureType.byName(type);
}

export default function ({
  publicKey,
  keyHash,
  ...props
}: {
  publicKey?: string | Uint8Array;
  keyHash?: string | Uint8Array;
  type?: DisplayTypeArg;
}) {
  const initialType = parseType(props.type);
  const [type, setType] = useState<DisplayType>(initialType);
  const [address, setAddress] = useState(null);

  if (typeof keyHash === 'string') {
    keyHash = Buffer.from(keyHash, 'hex');
  }
  if (typeof publicKey === 'string') {
    publicKey = Buffer.from(publicKey, 'hex');
  }

  useEffect(() => {
    if (type === 'plain') {
      setAddress(Buffer.from(publicKey).toString('hex'));
      return;
    }

    const hash = keyHash || Buffer.from(sha256(publicKey));
    if (type === 'hash') {
      setAddress(hash.toString('hex'));
      return;
    }

    const addr = Address.fromKeyHash(type, hash);
    setAddress(addr.toString());
  }, [keyHash, publicKey, type]);

  return (
    <div>
      {!address ? (
        <Skeleton active title={true} paragraph={false} />
      ) : initialType !== SignatureType.Unknown ? (
        <Input.Group compact className={'key'}>
          <Select
            defaultValue={initialType}
            size="small"
            className="key-type"
            onChange={setType as any}
          >
            {initialType === SignatureType.ED25519 && (
              <Select.Option value={SignatureType.ED25519}>
                ED25519
              </Select.Option>
            )}
            {initialType === SignatureType.RCD1 && (
              <Select.Option value={SignatureType.RCD1}>RCD1</Select.Option>
            )}
            {initialType === SignatureType.BTC && (
              <Select.Option value={SignatureType.BTC}>BTC</Select.Option>
            )}
            {initialType === SignatureType.ETH && (
              <Select.Option value={SignatureType.ETH}>ETH</Select.Option>
            )}
            <Select.Option value={SignatureType.Unknown}>Generic</Select.Option>
            <Select.Option value="hash">Hash</Select.Option>
            {publicKey && <Select.Option value="plain">Bytes</Select.Option>}
          </Select>
          <Text className="key-text" copyable>
            {address}
          </Text>
        </Input.Group>
      ) : (
        <Input.Group compact className={'key'}>
          <Select
            defaultValue={initialType}
            size="small"
            className="key-type"
            onChange={setType}
          >
            <Select.Option value={SignatureType.Unknown}>Address</Select.Option>
            <Select.Option value="hash">Hash</Select.Option>
            {Settings.enableDevMode && (
              <Select.Option value={SignatureType.ED25519}>
                ED25519
              </Select.Option>
            )}
            {Settings.enableDevMode && (
              <Select.Option value={SignatureType.RCD1}>RCD1</Select.Option>
            )}
            {Settings.enableDevMode && (
              <Select.Option value={SignatureType.BTC}>BTC</Select.Option>
            )}
            {Settings.enableDevMode && (
              <Select.Option value={SignatureType.ETH}>ETH</Select.Option>
            )}
          </Select>
          <Text className="key-text" copyable>
            {address}
          </Text>
        </Input.Group>
      )}
    </div>
  );
}
