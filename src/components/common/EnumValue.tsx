import React from 'react';

interface EnumType<V> {
  getName(value: V): string;
}

export function EnumValue<V>({ type, value }: { type: EnumType<V>; value: V }) {
  const s = type.getName(value).replace(/(^[a-z]|[a-z][A-Z])/g, (s) => {
    if (s.length == 1) {
      return s.toUpperCase();
    }
    return s.substring(0, 1) + ' ' + s.substring(1);
  });
  return <span>{s}</span>;
}
