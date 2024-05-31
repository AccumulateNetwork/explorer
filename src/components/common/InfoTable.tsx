import { Descriptions, DescriptionsProps } from 'antd';
import React, { useEffect, useState } from 'react';

export function InfoTable(props: DescriptionsProps) {
  const getLayout = (): DescriptionsProps['layout'] =>
    window.outerWidth > 800 ? 'horizontal' : 'vertical';

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
