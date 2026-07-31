# Changelog

All notable changes to the Accumulate Explorer are documented here.
The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

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
