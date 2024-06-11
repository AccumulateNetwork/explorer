import { Alert } from 'antd';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { TxID, TxIDArgs, URL } from 'accumulate.js';

export function Link({
  to,
  children,
  dataEntry,
  className,
  style,
}: {
  to: TxIDArgs;
  children: React.ReactNode;
  dataEntry?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const route = dataEntry ? 'data' : 'acc';
  if (typeof to === 'string' && /^[a-z]{64}$/i.test(to)) {
    return (
      <RouterLink
        to={`/${route}/${to}@unknown`}
        className={className}
        children={children}
        style={style}
      />
    );
  }

  let url: URL;
  try {
    url = to instanceof TxID ? to.asUrl() : URL.parse(to);
  } catch (error) {
    return <Alert type="error" message={`${error}`} />;
  }

  const s = url.toString().replace(/^acc:\/\//, '');
  return (
    <RouterLink
      to={`/${route}/${s}`}
      className={className}
      children={children}
      style={style}
    />
  );
}
