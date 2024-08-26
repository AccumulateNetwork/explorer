import { Descriptions, DescriptionsProps, Typography } from 'antd';
import React, { useState } from 'react';

export function InfoTable(props: DescriptionsProps) {
  const getLayout = (): DescriptionsProps['layout'] =>
    window.innerWidth > 750 ? 'horizontal' : 'vertical';

  const [layout, setLayout] = useState(getLayout());
  addEventListener('resize', () => setLayout(getLayout()));

  return (
    <Descriptions
      bordered
      column={1}
      size="middle"
      layout={layout}
      className="info-table"
      {...props}
    />
  );
}
