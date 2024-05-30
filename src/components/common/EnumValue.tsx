import { Alert } from 'antd';
import React from 'react';

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
    const s = type.getName(value).replace(/(^[a-z]|[a-z][A-Z])/g, (s) => {
      if (s.length == 1) {
        return s.toUpperCase();
      }
      return s.substring(0, 1) + ' ' + s.substring(1);
    });
    return <span>{s}</span>;
  } catch (error) {
    return <Alert type="error" message={`${error}`} />;
  }
}
