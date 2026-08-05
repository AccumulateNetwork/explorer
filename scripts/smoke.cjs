#!/usr/bin/env node
// Post-deploy / pre-release smoke test. Drives a headless Chromium against a
// running explorer (dev server, beta, or production) and asserts the pages a
// user actually hits render real content.
//
//   node scripts/smoke.cjs                                  # localhost:3000
//   node scripts/smoke.cjs https://explorer.accumulatenetwork.io
//
// Requires a Chrome/Chromium binary; set CHROME=/path/to/chrome to override.

const { chromium } = require('playwright-core');

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const CHROME =
  process.env.CHROME ||
  ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    .filter((p) => require('fs').existsSync(p))[0];

// A well-known mainnet transaction, in both reference forms (#69).
const HASH = 'accc878f25c1051b5e78823d20c7466f474fe67dbd3df49ffdf3e948c1621212';

const CHECKS = [
  {
    name: 'home',
    path: '/',
    expect: (t) => t.includes('Accumulate Explorer') && t.includes('Minor Blocks'),
  },
  {
    name: 'tx (bare hash)',
    path: `/tx/${HASH}`,
    expect: (t) => t.includes('Transaction Type'),
  },
  {
    name: 'tx (hash@authority)',
    path: `/tx/${HASH}@acme`,
    expect: (t) => t.includes('Transaction Type'),
  },
  {
    name: 'account',
    path: '/acc/acme',
    expect: (t) => t.includes('Token') && !t.includes('Error'),
  },
  {
    name: 'staking',
    path: '/staking',
    expect: (t) => /Stakers/.test(t) && t.includes('ACME Supply'),
  },
  {
    name: 'network (#40)',
    path: '/network',
    // The node table populates only if array-mode lists re-sync; a blank
    // table regresses issue #40.
    expect: (t, page) =>
      page.$$eval('table tbody tr', (r) => r.length).then((n) => n > 0),
  },
];

(async () => {
  if (!CHROME) {
    console.error('No Chrome binary found; set CHROME=/path/to/chrome');
    process.exit(2);
  }
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--headless=new'],
  });
  const page = await (await browser.newContext()).newPage();
  const failures = [];

  for (const check of CHECKS) {
    const url = BASE + check.path;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Give the SPA time to query the network; poll rather than sleep.
      const deadline = Date.now() + 45000;
      let ok = false;
      while (!ok && Date.now() < deadline) {
        const text = await page.innerText('body').catch(() => '');
        ok = await Promise.resolve(check.expect(text, page)).catch(() => false);
        if (!ok) await page.waitForTimeout(1000);
      }
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${check.name}  ${url}`);
      if (!ok) failures.push(check.name);
    } catch (e) {
      console.log(`FAIL  ${check.name}  ${url}  (${e.message.split('\n')[0]})`);
      failures.push(check.name);
    }
  }

  await browser.close();
  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('\nAll smoke checks passed.');
})();
