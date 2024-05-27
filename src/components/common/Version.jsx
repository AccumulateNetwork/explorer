import { Typography } from 'antd';
import React, { useEffect, useState } from 'react';

import RPC from '../../utils/RPC';

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
