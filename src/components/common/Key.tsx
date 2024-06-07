import { Alert, Input, Select, Skeleton, Typography } from 'antd';
import { signTypedData } from 'eth-sig-util';
import { useState } from 'react';
import React from 'react';

import { Address, sha256 } from 'accumulate.js';
import { SignatureType } from 'accumulate.js/lib/core';

import { Settings } from '../explorer/Settings';
import { useAsyncEffect } from './useAsync';

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
  const [error, setError] = useState(null);

  if (typeof keyHash === 'string') {
    keyHash = Buffer.from(keyHash, 'hex');
  }
  if (typeof publicKey === 'string') {
    publicKey = Buffer.from(publicKey, 'hex');
  }

  useAsyncEffect(
    async (mounted) => {
      if (type === 'plain') {
        setAddress(Buffer.from(publicKey).toString('hex'));
        return;
      }

      const hash = keyHash || (await sha256(publicKey));
      if (!mounted()) return;

      if (type === 'hash') {
        setAddress(hash.toString('hex'));
        return;
      }

      const addr = await Address.fromKeyHash(type, hash);
      const s = await addr.format();
      if (!mounted()) return;
      setAddress(s);
    },
    [keyHash, publicKey, type],
  ).catch((error) => setError(`${error}`));

  return (
    <div>
      {error ? (
        <Alert message={error} type="error" showIcon />
      ) : !address ? (
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
