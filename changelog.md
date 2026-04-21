# Changelog

All notable changes to the Accumulate Explorer are documented here.
The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

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
