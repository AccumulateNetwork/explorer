import { Buffer } from 'accumulate.js/lib/common';

import { isLocalWallet } from './walletMode';

// Hacks for node modules
window.global = window;
window.Buffer = {
  from(...args) {
    return Buffer.from(...args);
  },
  alloc(len) {
    return Buffer.from(new Uint8Array(len));
  },
  isBuffer(b) {
    return b instanceof Buffer;
  },
};

// Error logging.
//
// Deferred and dynamically imported: @sentry/core and @sentry/browser are
// ~172 KB that used to sit in the eager preload chunk and initialize during
// boot, ahead of anything the user came for (#55).
//
// Not loaded at all for the local-wallet build. That build is served by a
// wallet daemon running on someone's own machine, and it has no business
// reporting to a hosted service.
if (!isLocalWallet) {
  const start = () =>
    import('@sentry/browser').then((Sentry) => {
      Sentry.init({
        dsn: 'https://glet_28d2b827c697ea5e98fa6b47d46dcd23@observe.gitlab.com:443/errortracking/api/v1/projects/41502264',

        // The path names the account or transaction being viewed, so sending
        // it verbatim would ship browsing history along with the error. Keep
        // the route shape, drop the subject.
        beforeSend(event) {
          const scrub = (u) =>
            typeof u === 'string'
              ? u.replace(
                  /\/(acc|tx|data|block)\/[^?#]*/g,
                  (_, kind) => `/${kind}/<redacted>`,
                )
              : u;
          if (event.request?.url) {
            event.request.url = scrub(event.request.url);
          }
          if (event.breadcrumbs) {
            event.breadcrumbs = event.breadcrumbs.map((b) =>
              b?.data?.url
                ? { ...b, data: { ...b.data, url: scrub(b.data.url) } }
                : b,
            );
          }
          return event;
        },
      });
    });

  // Never on the critical path: idle time, or a short delay where
  // requestIdleCallback is unavailable (Safari).
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(start, { timeout: 5000 });
  } else {
    setTimeout(start, 3000);
  }
}
