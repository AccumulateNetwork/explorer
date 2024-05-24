import React, { useState, useEffect } from 'react';
import { Typography } from 'antd';

import RPC from './RPC';

const { Text } = Typography;

const Version = (props) => {
  const [version, setVersion] = useState('...');

  const getVersion = async () => {
    try {
      const response = await RPC.request('network-status', {}, 'v3');
      setVersion(response.executorVersion);
    } catch (error) {
      setVersion('unknown');
    }
  };

  useEffect(() => getVersion(), []);

  return <Text type="secondary">API version: {version}</Text>;
};

export default Version;
