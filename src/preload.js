import * as Sentry from '@sentry/browser';

import { Buffer } from 'accumulate.js/lib/common';

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

// Error logging
Sentry.init({
  dsn: 'https://glet_28d2b827c697ea5e98fa6b47d46dcd23@observe.gitlab.com:443/errortracking/api/v1/projects/41502264',
});
