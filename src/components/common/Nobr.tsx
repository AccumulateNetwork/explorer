import React from 'react';

export function Nobr({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return <span style={{ ...style, whiteSpace: 'nowrap' }}>{children}</span>;
}
