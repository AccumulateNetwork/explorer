import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { TxID, TxIDArgs, URL } from 'accumulate.js';

interface Props {
  to: TxIDArgs;
  children: React.ReactNode;
  dataEntry?: boolean;
}

export function Link(props: Props) {
  const route = props.dataEntry ? 'data' : 'acc';
  const { to, children } = props;
  if (typeof to === 'string' && /^[a-z]{64}$/i.test(to)) {
    return <RouterLink to={`/${route}/${to}@unknown`} children={children} />;
  }

  const url = to instanceof TxID ? to.asUrl() : URL.parse(to);
  const s = url.toString().replace(/^acc:\/\//, '');
  return <RouterLink to={`/${route}/${s}`} children={children} />;
}
