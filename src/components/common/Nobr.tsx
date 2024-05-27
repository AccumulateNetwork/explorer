import React from 'react';

export function Nobr({ children }: { children: React.ReactNode }) {
  return <span style={{ whiteSpace: 'nowrap' }}>{children}</span>;
}
