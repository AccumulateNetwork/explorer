import { Typography } from 'antd';
import React, { useContext, useEffect } from 'react';

import { Network } from '../common/Network';
import MinorBlocks from './../common/MinorBlocks';

const { Title } = Typography;

const Blocks = () => {
  const { network } = useContext(Network);

  useEffect(() => {
    document.title = 'Blocks | Accumulate Explorer';
  }, []);

  return (
    <div>
      <Title level={2}>Accumulate Explorer</Title>

      <div style={{
        height: 4,
        background: 'linear-gradient(90deg, #1890ff 0%, #40a9ff 100%)',
        borderRadius: 2,
        marginBottom: 24
      }} />

      <MinorBlocks url="acc://dn.acme" />
    </div>
  );
};

export default Blocks;
