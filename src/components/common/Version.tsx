import { Tag } from 'antd';
import React, { useContext, useState } from 'react';

import { ExecutorVersion } from 'accumulate.js/lib/core';

import { Network } from './Network';
import { useAsyncEffect } from './useAsync';

export function Version() {
  const [executor, setExecutor] = useState('...');

  const { api, network } = useContext(Network);
  useAsyncEffect(
    async (mounted) => {
      const { executorVersion } = await api.networkStatus();
      if (!mounted()) {
        return;
      }
      // const base = executorVersion < ExecutorVersion.V2 ? 'V1' : 'V2';
      let name: string;
      try {
        name = ExecutorVersion.getName(executorVersion) || String(executorVersion);
      } catch {
        // Handle unknown executor versions (e.g., v2-jiuquan)
        name = String(executorVersion);
      }
      name = name
        .replace(/^v\d-?/, '')
        .replace(/\b[a-z]/g, (s) => s.toUpperCase());
      setExecutor(`Accumulate ${name}`);
    },
    [network.id],
  );

  return <Tag>{executor}</Tag>;
}
