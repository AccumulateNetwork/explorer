import { URL, URLArgs } from 'accumulate.js';
import { Link } from 'react-router-dom';
import React from 'react';

interface Props {
  to: URLArgs;
  children: React.ReactNode;
}

export default function (props: Props) {
  const { to, children } = props;
  if (typeof to === 'string' && /^[a-z]{64}$/i.test(to)) {
    return <Link to={`/acc/${to}@unknown`} children={children} />;
  }

  const url = URL.parse(to);
  const s = url.toString().replace(/^acc:\/\//, '');
  return <Link to={`/acc/${s}`} children={children} />;
}
