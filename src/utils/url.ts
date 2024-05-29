import { URL } from 'accumulate.js';

export function getParentUrl(url: URL) {
  const path = url.path.replace(/^\/|\/$/g, '');
  if (path === '') return;

  const i = path.lastIndexOf('/');
  return new URL({
    scheme: 'acc',
    hostname: url.authority,
    username: url.username,
    pathname: i < 0 ? '' : '/' + path.substring(0, i),
    search: '',
    hash: '',
  });
}
