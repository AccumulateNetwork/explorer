import { URL, URLArgs } from 'accumulate.js';

export const ACME = URL.parse('acc://ACME');

/**
 * Percent-encode spaces in an Accumulate URL or route parameter.
 *
 * Account names may legitimately contain spaces, including a trailing one
 * (e.g. `acc://foo.acme/My Account `). By the time a route parameter reaches a
 * component, the `history` library's `decodeURI` has already turned any `%20`
 * back into a literal space. accumulate.js then parses the string with the
 * WHATWG URL parser (`new URL`), which strips leading and trailing whitespace —
 * silently dropping such a space and resolving the wrong, non-existent account
 * (a 404).
 *
 * Re-encoding spaces as `%20` before parsing keeps them intact. The Accumulate
 * API accepts the encoded form.
 */
export function encodeURLSpaces(s: string): string {
  return s.replace(/ /g, '%20');
}

/**
 * Strip an `acc://` scheme from user input, along with the whitespace
 * bracketing it.
 *
 * Search input is otherwise taken literally, because a space may be part of the
 * account name (see {@link encodeURLSpaces}). An explicit scheme is the one
 * unambiguous case: it marks exactly where the URL begins, so whitespace before
 * `acc://`, or between it and the authority, cannot belong to the name and is
 * always safe to drop. Input without the scheme is returned unchanged.
 */
export function stripAccScheme(s: string): string {
  const scheme = /^\s*acc:\/\/\s*/i.exec(s);
  return scheme ? s.substring(scheme[0].length) : s;
}

/**
 * The account reference to retry after `ref` was not found, or null if there is
 * nothing left to try.
 *
 * A trailing space is only treated as a copy/paste artifact once the reference
 * as typed has actually 404'd, so an account whose name really does end in a
 * space still resolves on the first attempt.
 */
export function retryWithoutTrailingSpaces(ref: string): string | null {
  const trimmed = ref.replace(/\s+$/, '');
  return trimmed === ref || trimmed === '' ? null : trimmed;
}

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
