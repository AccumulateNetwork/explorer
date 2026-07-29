import { Alert } from 'antd';
import React from 'react';

import { formatTypeName } from '../../utils/message';

interface EnumType<V> {
  getName(value: V): string;
}

export function EnumValue<V extends number>({
  type,
  value = 0 as V,
}: {
  type: EnumType<V>;
  value: V;
}) {
  try {
    return <span>{formatTypeName(type.getName(value))}</span>;
  } catch (error) {
    return <Alert type="error" message={`${error}`} />;
  }
}
