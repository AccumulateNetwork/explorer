# Vulnerability assessment

**Last reviewed:** 2026-08-14 (against `npm audit` on the current lockfile)

`npm audit` reports **50 advisories: 15 low, 23 moderate, 11 high, 1 critical.**

A raw count is not a risk assessment. This is a browser SPA: it ships no
server, makes no outbound requests except to the configured Accumulate APIs
and the metrics service, and most of what audit flags is either a build-time
dependency the user never executes or a Node-only code path that does not
exist in a browser. What follows separates the advisories that reach a user
from the ones that do not, so the number can be read rather than feared.

The previous revision of this file (2025-10-24) claimed 23 advisories, that
"all axios vulnerabilities" were eliminated, and that the tree was "approved
for production". None of those statements held any longer, and the file was
being read as an all-clear. It has been rewritten rather than amended.

---

## What reaches a user's browser

**Nothing high or critical, as of this review.**

`preact` was the exception until today: 10.27.2 shipped in the production
bundle via `@coinbase/wallet-sdk` and carried a high-severity JSON VNode
injection issue (fixed in 10.27.3). It was latent — the Coinbase connector is
disabled — but it was genuinely browser-side code. An override now pins
**preact ^10.29.8** and the advisory is cleared.

`axios` reaches the browser (two fixed-host `axios.get` calls for supply
metrics, plus accumulate.js's client). Its recent advisories — NO_PROXY
bypass SSRF, `Proxy-Authorization` leakage on redirect, form-data stream
handling — are all Node-adapter code paths that the browser build does not
execute. The pin was raised to **^1.19.0** regardless, which clears them
rather than relying on that argument.

## Overrides, and why each exists

```jsonc
"overrides": {
  "axios": "^1.19.0",   // accumulate.js wants ^0.27.2, factom wants ^0.24.0
  "preact": "^10.29.8"  // @coinbase/wallet-sdk wants ^10.24.2
}
```

**Keep the axios override.** `accumulate.js@0.11.9` depends on `axios@^0.27.2`
and `factom@1.4.3` on `^0.24.0`; without it both resolve to vulnerable 0.x
releases. `npm ls axios` shows 1.19.0 deduped everywhere.

**Keep the preact override** for the reason above.

**The `esbuild: ^0.21.0` override was removed.** It pinned 0.21.5, which is
_below_ the 0.24.3 fix for the advisory it was presumably added to address —
it was holding the tree on the vulnerable version. Removing it changes
nothing in practice (vite 5.4 depends on `esbuild ^0.21.3` and still resolves
0.21.5), but it no longer misrepresents itself as a mitigation. The advisory
is the esbuild dev server accepting cross-origin requests, which is
development-only and further mitigated by binding the dev server to loopback
(#58).

## Development-only, never shipped

- **`vitest` — the lone critical.** Arbitrary file read and execute _when the
  Vitest UI server is listening_. We run `vitest run` in CI and locally; the
  UI is never started, and vitest is a devDependency that is not part of any
  build output. This is the entire "1 critical" in the headline number.
- **`vite`, `rollup`, `postcss`, `picomatch`, `nanoid`, `defu`, `h3`, `ws`,
  `lodash`** — build and tooling dependencies. `vite` currently carries a
  path-traversal advisory in optimized-deps `.map` handling that is fixed in
  6.4.2; we are on 5.4.21, so clearing it means a major upgrade. Worth doing
  on its own terms, not as a security emergency: it affects the dev server,
  which is now loopback-only.

## Latent, in the bundle but unreachable

- **`@coinbase/wallet-sdk` / `@web3modal/ethers`** — the Coinbase connector
  is disabled (`enableCoinbase: false`), so this code is present but not
  exercised. It is the reason preact was in the bundle at all. Deferring the
  whole web3 stack until a wallet is actually used (#49) would remove it from
  the initial payload entirely.

## Re-checking this

```bash
npm audit                       # totals
npm audit --json | less         # per-package detail, including the fixed range
npm ls axios preact esbuild     # confirm the overrides resolved
```

Update this file when the numbers move, and say what changed rather than
restating a total. A count with no interpretation is what made the previous
revision misleading.
