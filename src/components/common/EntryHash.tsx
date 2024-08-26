import { Typography } from 'antd';
import React, { useState } from 'react';

import { DataEntry } from 'accumulate.js/lib/core';

import { useAsyncEffect } from './useAsync';

const { Text } = Typography;

export function EntryHash({ entry }: { entry: DataEntry }) {
  const [hash, setHash] = useState<Uint8Array>(null);

  useAsyncEffect(
    async (mounted) => {
      const hash = await entry.hash();
      if (mounted()) {
        setHash(hash);
      }
    },
    [JSON.stringify(entry.asObject())],
  );

  if (!hash) {
    return null;
  }
  return (
    <Text copyable className="code">
      {Buffer.from(hash).toString('hex')}
    </Text>
  );
}
