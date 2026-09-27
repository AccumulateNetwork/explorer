# Changelog

All notable changes to the Accumulate Explorer are documented here.
The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

## [0.4.12] - 2026-09-27

Kermit reads as live again, and the linter found real bugs on the way to zero warnings.

### Fixed
- **Kermit's network badge is green again, and its dashboard, version and signature pages load.** Kermit runs Kourou and reports executor version `v2-kourou`, which the bundled SDK did not know, so every `network-status` call threw. `sdk-patches.ts` existed for exactly this but replaced a function the decoder never calls; it now patches the one it does, and an unknown version reads as "unknown" instead of breaking the page. ([#87](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/87))
- **The block list's "show anchors" toggle works.** Its columns were memoized once, so switching anchors off changed neither the rows nor the count; each row was also remounted on every render. ([#65](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/65))
- **Form validation debounces, and validates what is on screen.** The debounce called the callback from the first render — creating a sub-identity validated against the parent seen at mount — and lost its timer on every re-render, so it did not debounce at all. ([#65](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/65))
- **Switching network refetches** on the Validators, token issuer (ACME supply), Staking and network dashboard pages and the network badge, instead of showing the previous network's data. ([#65](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/65))
- **Send Tokens no longer checks the recipient's token against the previous sender's issuer**, or throws before the issuer has loaded. ([#65](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/65))
- **Errors are no longer swallowed** after a transaction form closes, and a WalletConnect modal that fails to open now fails the connect instead of hanging it. ([#65](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/65))

### Changed
- **ESLint is at zero warnings and CI fails on a new one.** Each of the 204 was fixed or kept as a line disable stating why. ([#65](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/65))
- **CI is green.** The Netlify deploy jobs — failing every pipeline since beta was decommissioned — and the Pages job are removed, with `netlify.toml`. Production still deploys only by hand (DEPLOYMENT.md). ([#94](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/94))
- `package-lock.json` carries the release version again; it had stayed at 0.4.8 since 0.4.9.

## [0.4.11] - 2026-09-11

The signature table answers per authority, and keeps answering after a transaction finishes.

### Changed
- **Signatures are grouped by the authority they belong to.** Every authority of the principal gets a row, disabled ones included, and so does any other book that signed; each row splits into Signatures, Rejections and Historical, and every record lands in exactly one group of one row. Rejections are carved out because they are live signatures voting *no*, not because they stopped counting — reject and abstain share the group, each row tagged with which, since the executor counts any vote that is not accept as a reject. ([#83](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/83))

### Fixed
- **A completed transaction no longer collapses to one flat list.** The chain clears the active set on execution, so every record is flagged `historical` and the flag separates nothing — the very question the table exists to answer. The two rules that decide membership are replayed from the records instead: a signature at a higher signer version replaces the set, and a later signature from the same key overwrites the earlier one. On the real rejected distribution for pay period 192 this recovers the accept a signer later overrode with a rejection, and names why. While a transaction is pending nothing changes: the chain still decides, and the rules only supply the reason. ([#86](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/86))

  The rule read is the cohort *within* the record — the highest signer version present — never a comparison against the key page's current version, which reports live votes as dead and has destroyed a real quorum ([#81](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/81)). A test asserts the one-directional soundness that rests on.
- **A disabled authority no longer reads as Pending.** Its vote is not required except on `UpdateAccountAuth`, so showing it as pending said we were waiting on it. It says Not required, with a note explaining that auth checks are off and anyone may sign for it. ([#86](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/86))

## [0.4.10] - 2026-09-01

Follow-up to 0.4.9: the second signature table learns the same lesson as the first.

### Fixed
- **The Required table no longer files discarded signatures under the authority they were made for.** Expanding `Authority acc://staking.acme/book` on the pending ACME distribution listed four signatures — three of them the ones [#81](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/81) established are dead — presented identically to the one that counts, so a reader counted four valid authority signatures where the chain counts one. A new **Invalid** row holds what the chain no longer holds, `Authority` and `Other` keep only what it does, and every record lands in exactly one row. ([#82](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/82))

  The flag behind this does not say *why* a signature left the active set: either a higher-version signature replaced the set, or the signer emitted the authority signature that supersedes it — which also clears it. The row asserts only what that supports, and names both cases rather than telling every signer to sign again.

## [0.4.9] - 2026-09-01

Correctness of the signature panel, and the code health work of phase 4 ([#36](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/36)).

### Fixed
- **A pending transaction no longer counts signatures the chain has discarded.** When a signature arrives at a higher signer version than a signer's active set holds, the executor replaces the set rather than joining it, and everything already on it is dropped. The API flags those records `historical`; the explorer did not read the flag, so period 196's distribution on ACME displayed a green `SIGNATURES: 4 of 4` while the chain counted 1. Discarded votes now say so, name the version they signed against, and explain that those signers must sign again. ([#81](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/81))

  Note what does **not** invalidate a signature: editing the page. The active set is replaced only by a signature at a higher version, so a signature made against an older version keeps counting until then. Deciding this by comparing versions calls live votes dead — the staking signer measured a real 3-of-4 destroyed that way — so the node's own verdict is the only test used here, and the real records either side of that replacing signature are both pinned as fixtures.
- **Two crashes from spreading a value that can be undefined**, found by turning ESLint on. ([#67](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/67))

### Changed
- **`queryEffect` is now `useQuery`.** It was a hook that did not look like one: it returned a thenable whose `.then()` called `useAsyncEffect`, so hook ordering depended on every caller invoking `.then` exactly once, unconditionally, at the top level. Nothing enforced that, and `Authorities.tsx` had an early return three lines below one. All 23 overloads are preserved. ([#63](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/63))
- **`InfiniteList` and `InfiniteTable` share their paging.** 773 lines with ~185 byte-identical and in order, already drifting; the paging decisions now live in a pure module with no React or DOM. ([#62](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/62))
- **Dead pagination code deleted rather than maintained.** `Chain` built an enrichment map every page and threw it away, and four cursor entries existed for one that was never written; `Chain` drops from 663 lines to 591. This supersedes part of the memoization added in [#56](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/56) — deleting dead work beats memoizing it. ([#64](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/64))

### Security
- **The files Node executes at build time are now guarded by a test.** The 2026-08-14 mirror compromise put a 33,231-character obfuscated payload on one line of `vite.config.js`, which resolved a second stage from Ethereum RPCs and spawned a detached process that outlived the build. `tsc` does not read those files and ESLint did not lint them, and the change sat in a commit that looked like a release. The test asserts no absurdly long line, no process spawning, and no hex-identifier obfuscation — verified against the real payload, which fails three checks independently. The advice that hid the compromise is corrected.

### Internal
- **ESLint, with `react-hooks` and `typescript-eslint`.** There were 17 `eslint-disable` comments in a repo with no ESLint installed; they read as considered exceptions and suppressed nothing. The rules that earn their place are the ones that would have caught bugs already fixed by hand — `rules-of-hooks` for the conditional hooks that crashed the Authorities and Signatures panels ([#44](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/44), [#46](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/46)), `exhaustive-deps` for the mount-only effects that leaked one account's data onto another's ([#43](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/43)). ([#65](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/65), [#67](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/67))
- Tests for `ManagedRange`, `isRecordOf` and query error handling — three untested modules the whole app runs through, where a wrong answer shifts rows or renders the wrong page rather than failing.

### Documentation
- **Beta is recorded as gone, and two dangling subdomains flagged.** Certificate transparency dates its death to around March 2026 — five months before the mirror compromise, so Netlify never built the malicious commit.

## [0.4.8] - 2026-08-19

Bundle size and request volume (phase 3 of [#36](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/36)). The initial download drops from 6.7 MB to roughly 2.3 MB, a transaction page makes 41 requests instead of 256, and account pages make about a quarter fewer.

### Changed
- **A transaction page makes 41 requests instead of 256.** Cause and produced lists queried once per row, each row's status re-queried the id it had just fetched, and the produced-status walk recursed one query at a time with no memory of what it had already seen — once per status shown on the page. Lookups are now batched and shared. ([#50](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/50))
- **Syntax highlighting no longer ships ~190 language grammars to highlight JSON** — 892 KB becomes 37 KB, on the landing page's critical path. ([#52](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/52))
- **The IANA timezone database is no longer downloaded.** It was most of the main chunk, for a timezone API nothing calls; the index chunk drops from 984 KB to 336 KB. ([#51](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/51))
- **The WalletConnect stack loads when someone connects a wallet**, not on every page view, which also removes a network round trip from every page load. ([#49](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/49))
- **Factom loads only when an FA address is searched**, and Sentry initializes at idle instead of during boot — and not at all in the local-wallet build. ([#54](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/54), [#55](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/55))
- **Account pages fetch less.** They fetched a single record purely to learn a total before fetching the page they wanted, re-queried the account already loaded by the page around them, and mounted every chain at once; chains below the fold now load when scrolled to. `/acc/ACME` goes from 19 requests to 14. ([#57](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/57))
- **Typing in the anchor-block field no longer re-renders the whole block list** — 350 DOM mutations over seven keystrokes becomes none. The scroll listener also stopped detaching and reattaching on every render. ([#56](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/56))

### Fixed
- **Sentry no longer reports which accounts you browse.** Page URLs name the account or transaction being viewed and were sent verbatim; the route shape is kept and the subject redacted. ([#55](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/55))

### Internal
- Removed an `import 'rxjs'` whose comment admitted nobody knew why it was needed. The reason was a Ledger import that was shadowed on the next screen and never called; both are gone, and rxjs is no longer a direct dependency. ([#53](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/53))

## [0.4.7] - 2026-08-14

Security and delivery pass (phase 2 of [#36](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/36)).

### Security
- **The dev server no longer exposes the local wallet API to the network.** It listened on every interface while proxying `/v1` to a locally running wallet, whose entire auth model is same-origin with a per-run session token — so anyone on the same LAN, VPN or conference wifi could mint a token and drive signing and sending, without a passphrase, because auto-connect keeps the vault unlocked. Now bound to loopback; set `VITE_DEV_HOST` deliberately for cases like testing on a phone. ([#58](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/58))
- **Typed data returned by an eth endpoint is checked before it is signed.** The app posted a transaction to the endpoint and handed the response straight to the wallet, so a compromised or intercepted endpoint could describe a different transaction and the only backstop was the user reading the wallet prompt closely. The response must now match the request in both directions — which is what rejects an *added* recipient alongside your own payment. ([#60](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/60))
- **Production sends security headers and a Content Security Policy.** `netlify.toml` declared them but only covers beta; the live nginx site sent none. The CSP is Report-Only pending a wallet-flow check. ([#59](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/59))
- **Source maps are no longer published.** They were served with full `sourcesContent`; they are now emitted `hidden` and excluded from the deploy. ([#48](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/48))
- **`preact` is patched** — 10.27.2 shipped in the bundle via the Coinbase SDK with a high-severity JSON VNode injection issue, the one genuinely browser-side advisory in the tree. axios raised to 1.19.0. ([#61](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/61))

### Changed
- **The bundle is 42% smaller.** Minification had been disabled during SDK decorator work and was never restored: 11.65 MB of JavaScript becomes 6.7 MB, and 2.37 MB gzipped becomes 1.77 MB. ([#48](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/48))
- `VULNERABILITIES.md` rewritten. It claimed 23 advisories and "approved for production" while `npm audit` reported 54; it now separates what reaches a browser from build-time noise, and records why each override exists. The `esbuild` override was removed — it pinned a version *below* the fix for the advisory it appeared to address. ([#61](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/61))

## [0.4.6] - 2026-08-14

### Fixed
- **A pending multisig transaction no longer reads as complete.** The header counted key-signature messages and explicitly skipped authority signatures — the only records the accept threshold counts — so the number shown was the complement of the right set. The mainnet staking distribution for pay period 193 displayed "SIGNATURES: 5" against a threshold of 4 while sitting pending for days with two votes. The header now reads votes against the threshold, e.g. `3 of 4`. ([#75](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/75))
- **Signatures that cannot count are no longer indistinguishable from votes.** The Signatures section now breaks a transaction down entry by entry on the governing page: *voted* (a delegate delivered an authority signature, or a key matching the entry signed the page directly), *signed but not counted* — shown with the delegate page's own progress, e.g. "CodeForj.acme/book/2 has 1 of 2 required" — or nothing. Operators whose signature can never count could previously see it on the page with no way to tell. ([#76](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/76))
- Votes are attributed by where a signature landed rather than by its authority field, so a nested delegate's vote counts once for the entry it arrived through instead of twice.
- **An executed transaction signed by a since-rotated key reports its full count.** The key page returned with a transaction is its state *now*, not when it was signed, so a vote from a key later rotated off the page went missing — under-reporting a delivered transaction. Those votes are counted and labelled instead of dropped.

## [0.4.5] - 2026-08-12

### Fixed
- **Kermit and Fozzie deep links open on their own network.** `kermit.explorer.accumulatenetwork.io` opened on Mainnet, so a real Kermit transaction appeared not to exist. The stored network setting defaulted to `mainnet`, which made "the user has not chosen a network" indistinguishable from "the user chose mainnet" — the hostname defaults below that check were unreachable. The setting now defaults to empty, and a network is persisted only where the user actually selects one; previously it was written on every context construction, so a network nobody chose became sticky. ([#73](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/73))
- **Browsers that already visited a network-specific host are recovered.** One visit to the Kermit host under the old code wrote `networkName="mainnet"`, and that value is indistinguishable from a real choice — so the fix above would have left every previous visitor on Mainnet. The setting moves to a new key and the old one is swept once; everyone falls back to the hostname default a single time, and only selections made from now on are remembered. ([#73](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/73))

### Note
- `localhost` no longer maps to the local devnet — that branch was unreachable too, and reviving it would point development and the smoke script at a devnet that is usually not running. Pin it explicitly with `VITE_NETWORK=local`, or use the network selector.
- A structural successor to this fix — one build and document root per network, the selector as navigation, and cross-network hash lookup by redirect — is [#74](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/74).

## [0.4.4] - 2026-08-05

### Added
- **The Accumulate UI style guide now lives in this repo**, as the authoritative `docs/design/ui-style.md` — moved from the staking repo, which keeps a pointer stub, so a visual change and its documentation land in the same MR. ([#71](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/71))
- **Browser-tab identity for every Accumulate tool** (guide §9, settled through design review): white tool marks — the real logo star, wallet, token stack, oval keyhole, chart bars, capital A, inbox tray — on network-colored grounds (`#1890ff` mainnet / `#531dab` testnet / `#a8071a` local, favicon-specific tokens legible at 16px), with DTRules network-agnostic on fixed orange. Includes 22 copy-paste favicon snippets and the rule that the favicon swaps when the user switches network. The explorer's own network-aware favicon swap is queued under [#36](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/36).
- `<meta name="theme-color">` (`#0958d9`) tints browser chrome to the mainnet header color.

## [0.4.3] - 2026-08-04

### Fixed
- **Chain tables no longer show a different account's transactions.** The query range behind a chain table captured the URL of the first render, and navigating between two accounts of the same kind reused it — account B's Transactions and Signatures tables listed A's entries with links to A's txids. The range now rebinds (and the tables remount) whenever the target changes. ([#39](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/39))
- **Array-backed lists re-sync when their content changes.** Items were re-derived only when the array *length* changed, so the `/network` node table stayed permanently blank, the Favourites star never visually toggled, and `/block/N` → `/block/N+1` kept block N's transactions when both had the same count. ([#40](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/40))
- **Data-entry lists are no longer truncated to the newest 50 chain entries.** The API answers a from-end range with `start = total − count`, which the filter's termination test misread as "scanned everything" on every first page; the total was fixed to the matches within the newest 50 and older entries were unreachable. ([#41](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/41))
- **The data viewer renders the entry being viewed.** Navigating between two text entries re-rendered the previous entry's payload under the new txid, and a stale "JSON" option lingered in the selector. ([#42](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/42))
- **Staking rows and signature authorities no longer leak across navigations.** Both were fetched in mount-only effects on components that are reused between pages. ([#43](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/43))
- **Anchor transactions show their signature list when the validator table cannot render.** `<Validators/> || fallback` never rendered the fallback — a JSX element is always truthy — so those pages showed an empty Signatures section. Also fixed a latent hooks-order violation, a crash on unsequenced anchors, and per-key debug logging in the same file. ([#44](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/44))
- **Malformed references render cleanly and empty ones 404.** The URL fallback rendered `acc://ACME undefined` (unset components stringified literally) and `/acc/` crashed to the ErrorBoundary screen. ([#45](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/45))
- **Navigating between accounts with and without explicit authorities no longer crashes the page.** Hooks ran after four early returns, so the hook count changed with the account kind. ([#46](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/46))
- **AddCredits pages show the credits actually purchased.** The display path divided by 1e10 where the protocol executor divides by 1e8, underreporting every credit purchase 100×. ([#66](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/66))
- **Timezone labels, stray zeros, `/data/` crash, pending order.** `Timestamp (UTC-)` and `UTC--5` are now `UTC-5`; empty cause/produced lists no longer render a stray `0`; `/data/` 404s instead of crashing; pending transactions past the first page are no longer scrambled. ([#47](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/47))
- **Network liveness measures delivery, not execution backlog.** The synthetic-ledger check compared `produced` against `delivered`, counting arrived-but-unexecuted transactions as downtime — on a long-running network that backlog is permanent, so mainnet could show as not-live. It now compares against `received`. ([#70](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/70))

### Added
- **BigInt amount arithmetic is tested** — all nine recipient-producing transaction types, truncation semantics, and beyond-2^53 exactness, pinned to the protocol executor's formula. ([#66](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/66))
- **`npm run smoke`** drives headless Chrome through the pages users actually hit (both `/tx/` forms, account, staking, `/network`) against any environment — the verification step for every release and deploy.
- Unit tests for `ChainFilter` pagination, the chain-range factory, route-reference parsing, and timezone labels (100 tests total, up from 58).

### Documentation
- **DEPLOYMENT.md now describes the real deploy process.** Production is nginx on server1 fed by rsync — not Netlify — and requires a `VITE_NETWORK=any` build; beta is Netlify off the GitHub mirror's `main`. The old doc's fiction cost three months of unshipped fixes. ([#34](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/34))

## [0.4.2] - 2026-07-31

### Fixed
- **Canonical `<hash>@authority` transaction IDs resolve on the `/tx/` route.** `/tx/<hash>` worked but `/tx/<hash>@acme` — the form users copy from CLI output and API responses — errored. `Acc` unconditionally appended `@unknown` to make the reference queryable, and the WHATWG parser folded the inner `@` into the hash (`<hash>%40acme`), so the node was asked for an invalid hash. `@unknown` is now only appended when the reference does not already name an authority. ([#69](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/69))

### Internal
- **CI standardised on npm and installs from the lockfile.** The stale parallel `yarn.lock` is gone; CI uses `npm ci`, so builds run against the dependencies that were actually tested. ([#37](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/37))
- **`check:format` is now a real gate.** It ran prettier without `--check` and always passed; it now fails on drift, CI enforces it, and the tree has been formatted. ([#36](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/36), [#38](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/38))

## [0.4.1] - 2026-07-29

### Fixed
- **Transactions no longer report Success when something they produced failed or is still pending.** `getProducedStatus` recursed inside a `.map()` returned from `.then()` rather than passed through `Promise.all`, so the status array held Promises; both `>= 400` and `=== Pending` compared against a Promise and were always false, leaving `Delivered` as the only reachable outcome. A send-tokens whose synthetic deposit had errored rendered a green SUCCESS tag. ([#35](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/35))
- **Removed a `debugger` statement that was shipping to production.** It sat at the top of the `Validators` component and survived the build, so any visitor with devtools open on an anchor transaction hit a breakpoint. ([#35](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/35))

## [0.4.0] - 2026-07-29

### Added
- **Vitest unit tests and a `tsc` gate in CI.** Routes, wallet client, wallet mode, URL handling and message decoding are covered (46 tests).
- **Local-wallet build profile and dev proxy.** The dev server proxies wallet API calls to a locally running `ccli webui` so it behaves like the embedded same-origin release build.

### Changed
- **React 18 and react-router v6.** Splat routes (`/acc/*`, `/tx/*`) replace v5's `:url+` for slash-containing account and transaction references.
- **Wallet panel rebuilt against the real API**, with a wallet dock and an explicit wallet mode.
- **Dev proxy defaults to wallet port 8437** instead of 8080.
- **Depth and contrast pass.** Shadows, highlights, scroll-edge fades, and lighter light-mode borders (`#bfbfbf` → `#dfdfdf`).

### Fixed
- **Cause and produced rows name the transaction instead of showing `unknown`.** Synthetic and anchor traffic arrives wrapped — a `SequencedMessage` carries the payload in `.message`, not `.transaction` — so type and principal lookups missed the body and reported the envelope. Rows now unwrap first, render types in the same title case as the Transaction Type row, and carry the full TxID as a tooltip. `unknown · 01d9eb82` becomes `Synthetic Burn Tokens · acc://acme`. ([#33](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/33))
- **Searching an account with a stray leading or trailing space resolves instead of 404ing.** The reference is queried exactly as typed first, so an account whose name genuinely ends in a space still wins; only after that fails is the trimmed form retried. Whitespace around an `acc://` scheme is dropped up front. ([#32](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/32))
- **Enrichment now runs for short lists.** `enrichPage` was only wired into the server-mode path, so array-mode callers (cause and produced lists) never resolved types at all. ([#31](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/31))
- Transaction types resolve for signatures, enum message types, and numeric `body.type` values. ([#31](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/31))
- Accounts whose URL contains spaces resolve rather than silently dropping the space and 404ing.
- TypeScript errors across app source; `tsc` now gates CI.

### Internal
- `TxnInfo` and `MsgInfo` shared byte-identical copies of the cause/produced enrichment and row component; both are now one `RelatedTxn`. Message-decoding helpers moved to `src/utils/message.ts` so they can be unit tested without rendering, and `EnumValue` reuses the shared type-name formatter.

## [0.3.0] - 2026-04-23

### Added
- **Unified infinite-scroll list presentation across the entire explorer.** One shared `InfiniteList` / `InfiniteTable` primitive replaces every `Table` pagination and ad-hoc scroll window. Lists with ≤10 items render as a plain bordered list; lists with >10 items render a 600px, 25-row windowed scroll with URL-cursor binding. ([#19](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/19))
- **Enriched transaction rows everywhere.** Any list row that represents a transaction now shows `<type> · <adi>/<path> @ HH:mm:ss` as a full-row link to `/tx/<hash>`, with a short-hash + `unknown` fallback. No more raw hex-hash labels. Batched `api.call(...)` per loaded page projects the tx type.

### Changed
- **Account pages.** Chain tables (pending, main, scratch, signatures, up to 4 per page) are windowed; Directory and DataLedger migrate to the shared primitive. Authorities, KeyBook pages, KeyPage keys + blacklist, and DataAccount state-entry parts all render through the same component so presentation is uniform at any item count.
- **Explorer pages.** Blocks, Block detail, Tokens, Validators, Staking stakers, NetworkDashboard entries and peers, and Favourites all share the same scroll / short-list rendering. Column sorting preserved on Tokens and Validators.
- **Message views.** `TxnInfo` and `MsgInfo` `cause` and `produced` lists, plus `UpdateAccountAuth` / `UpdateKeyPage` operations, `WriteData` entry parts, and `Data` entry parts now use `InfiniteList`. cause/produced rows pick up the enriched transaction format.
- **`describeProperty` array branch.** Arrays > 10 entries (notably `BlockLedger.entries`) now render through `InfiniteList` instead of inlining every row as a `<Descriptions.Item>`.
- **MinorBlocks** migrated off its bespoke scroll window and enrichment pipeline onto the shared primitive. `?block=N` cursor binding, anchor-block bar, and anchor-row format preserved.
- **`CompactList` deleted.** The "+N more" UX is replaced by the short-list / windowed rule.

### Fixed
- Cursor writeback on Tables now fires after mount-restore completes, not during (prevents the scroll-sync loop from racing with the restore page-walk).

## [0.2.2] - 2026-04-22

### Added
- **Infinite scroll on Minor Blocks.** Dropped pagination. Initial 100 blocks render in a 600px scrollable window; reaching the bottom loads another 100, until all are loaded.
- **Anchor-block bar.** Above the Minor Blocks table, a dedicated `Anchor block: [N] [Go] [Latest]` widget reads and writes `?block=<N>` in the URL. The top visible block is persisted to the URL on scroll so returning from `/tx/...` or a refresh restores your position instead of snapping back to newest blocks. Auto-loads extra pages on mount until the target block is in view (up to 2000 blocks back).
- **Hard-outlined surfaces.** Stats cards and the Minor Blocks table get solid black (light) / light-white (dark) 1px borders so edges read cleanly.
- **Halo circle behind the header logo** so the hexagon sits on solid white regardless of the header's deep blue.

### Changed
- **Bold color scheme.** Light-mode body is now `#f0f0f0`; header is `#0958d9` (antd blue-7) with pure-white nav, badge and button contents at `font-weight: 600`. Layered table surfaces for clear row/header/hover distinction in both themes.
- **Anchor row formatting in Minor Blocks.** Anchor transactions now render as `anchor [<name>]: block <N> @ <HH:mm:ss> · root #<rootIndexIndex>` instead of the hex+account display. `majorBlockTime` is shown when present on the entry.
- **Landing page stripped.** Removed the ACME-price, Favourites, and Join-Community cards and their decorative icons; only the ACME token card (mainnet) and Faucet card (testnets) remain, plus the Minor Blocks list. `/favourites` route is still reachable by URL but no longer in the nav.
- **Footer** no longer displays the raw mainnet API URL.
- **SearchForm** mirrors the `?block=<N>` URL param so the search field always shows the currently-anchored block.

### Fixed
- Header not flush with viewport edges (`100vw` was overshooting past the scrollbar gutter; switched to `100%`).
- Theme-toggle button invisible on the deep blue header (inline `#fff` styles instead of relying on antd ghost tokens).
- Logo menu item no longer paints a translucent highlight square on hover/active.

## [0.2.1] - 2026-04-22

### Changed
- Theme toggle simplified from a 3-state cycle (Light / Dark / System) to a plain 2-state Light ↔ Dark button. One click flips the theme instead of two. ([#18](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/18))

### Migration
- Users with `themeMode = 'system'` stored from 0.2.0 are transparently migrated to `'light'` on first load (or `'dark'` if you landed on a dark-mode render before the migration ran).

## [0.2.0] - 2026-04-21

### Changed
- **antd upgraded from v4 to v5.** End-of-life v4 dropped in favor of the current major. `antd/dist/antd.css` is gone (v5 is CSS-in-JS); theming is now driven by a `ConfigProvider` at the app root. ([#16](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/16))

### Added
- **Dark mode.** Theme toggle in the header (Light / Dark / System). Preference is persisted in localStorage and synchronized across tabs via `BroadcastChannel`. `system` follows the OS `prefers-color-scheme`. A pre-paint script in `index.html` sets `data-theme` on `<html>` so the page never flashes the wrong theme on load. Implemented on top of antd v5's `theme.darkAlgorithm` — the framework handles component colors natively; targeted CSS overrides were added only for the handful of hardcoded light colors in `App.css` that fight the algorithm. ([#5](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/5))

### Fixed
- `<Button type="ghost">` replaced with `<Button ghost>` (v5 removed the `"ghost"` button type).
- `antd/lib/menu/hooks/useItems` import path updated to `antd/es/menu/interface` (internal path was removed in v5).

## [0.1.1] - 2026-04-21

### Fixed
- Network switcher now sticks across reloads on `kermit.explorer` and `fozzie.explorer` deployments. `defaultNetworkName()` previously short-circuited on hostname and discarded the user's saved selection. ([#9](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/9))
- Status-badge health probes no longer trigger the global "API call failed" toast. The badge is a silent indicator and now logs to the console instead of raising a user-facing error. ([#10](https://gitlab.com/accumulatenetwork/ecosystem/explorer/-/issues/10))

## [0.1.0]

Baseline release.
