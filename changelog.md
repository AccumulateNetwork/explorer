# Changelog

All notable changes to the Accumulate Explorer are documented here.
The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

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
