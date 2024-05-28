import { Alert, Input, Select, Skeleton, Typography } from 'antd';
import { useState } from 'react';
import React from 'react';

import { Address, sha256 } from 'accumulate.js';
import { SignatureType } from 'accumulate.js/lib/core';

import { Settings } from '../explorer/Settings';
import { useAsyncEffect } from './useAsync';

const { Text } = Typography;

export default function (props: {
  publicKey?: string;
  keyHash?: string | Uint8Array;
  type?: string;
}) {
  const { publicKey, keyHash } = props;
  const [type, setType] = useState(props.type);
  const [address, setAddress] = useState(null);
  const [error, setError] = useState(null);

  useAsyncEffect(
    async (mounted) => {
      const hash = !keyHash
        ? await sha256(Buffer.from(publicKey, 'hex'))
        : keyHash instanceof Uint8Array
          ? keyHash
          : Buffer.from(keyHash, 'hex');
      if (!mounted()) return;

      if (type === 'hex') {
        setAddress(hash.toString('hex'));
        return;
      }

      const sigType = type ? SignatureType.byName(type) : SignatureType.Unknown;
      const addr = await Address.fromKeyHash(sigType, hash);
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
      ) : props.type ? (
        <Input.Group compact className={'key'}>
          <Select
            defaultValue={props.type}
            size="small"
            className="key-type"
            onChange={setType}
          >
            {props.type === 'ed25519' && (
              <Select.Option value="ed25519">ED25519</Select.Option>
            )}
            {props.type === 'rcd1' && (
              <Select.Option value="rcd1">RCD1</Select.Option>
            )}
            {props.type === 'btc' && (
              <Select.Option value="btc">BTC</Select.Option>
            )}
            {props.type === 'eth' && (
              <Select.Option value="eth">ETH</Select.Option>
            )}
            <Select.Option value="unknown">Generic</Select.Option>
            <Select.Option value="hex">Hash</Select.Option>
          </Select>
          <Text className="key-text" copyable>
            {address}
          </Text>
        </Input.Group>
      ) : (
        <Input.Group compact className={'key'}>
          <Select
            defaultValue="unknown"
            size="small"
            className="key-type"
            onChange={setType}
          >
            <Select.Option value="unknown">Address</Select.Option>
            <Select.Option value="hex">Hash</Select.Option>
            {Settings.enableDevMode && (
              <Select.Option value="ed25519">ED25519</Select.Option>
            )}
            {Settings.enableDevMode && (
              <Select.Option value="rcd1">RCD1</Select.Option>
            )}
            {Settings.enableDevMode && (
              <Select.Option value="btc">BTC</Select.Option>
            )}
            {Settings.enableDevMode && (
              <Select.Option value="eth">ETH</Select.Option>
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
