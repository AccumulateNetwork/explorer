import { URL, URLArgs } from 'accumulate.js';

export const ACME = URL.parse('acc://ACME');

export function getParentUrl(url: URLArgs) {
  url = URL.parse(url);
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

export function isLite(url: URLArgs) {
  url = URL.parse(url);
  return /^[0-9a-f]{48}$/i.test(url.authority);
}
