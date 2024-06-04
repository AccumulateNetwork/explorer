import { Descriptions, DescriptionsProps, Typography } from 'antd';
import { DescriptionsItemProps } from 'antd/lib/descriptions/Item';
import React, { useState } from 'react';
import { RiQuestionLine } from 'react-icons/ri';

import { WithIcon } from './WithIcon';

const { Text } = Typography;

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
