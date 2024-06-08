import React from 'react';

export function Nobr({
  children,
  style,
  className,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <span style={{ ...style, whiteSpace: 'nowrap' }} className={className}>
      {children}
    </span>
  );
}
