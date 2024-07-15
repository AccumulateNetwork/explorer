import { Alert } from 'antd';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { TxID, TxIDArgs, URL } from 'accumulate.js';

export function Link({
  to,
  dataEntry,
  ...props
}: {
  to: TxIDArgs;
  children: React.ReactNode;
  dataEntry?: boolean;
  className?: string;
  style?: React.CSSProperties;
  target?: string;
  rel?: string;
}) {
  const route = dataEntry ? 'data' : 'acc';
  if (typeof to === 'string' && /^[a-z]{64}$/i.test(to)) {
    return <RouterLink to={`/${route}/${to}@unknown`} {...props} />;
  }

  let url: URL;
  try {
    url = to instanceof TxID ? to.asUrl() : URL.parse(to);
  } catch (error) {
    return <Alert type="error" message={`${error}`} />;
  }

  const s = url.toString().replace(/^acc:\/\//, '');
  return <RouterLink to={`/${route}/${s}`} {...props} />;
}
