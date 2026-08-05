# Accumulate UI style definition

Status: AUTHORITATIVE — this doc lives with the canonical implementation.
**The explorer is the canonical look for every Accumulate web surface**, and
this file is the written form of that look. Anyone changing the explorer's
visual system (App.css, `ThemeProvider.tsx`, index.css) must update this doc
in the same MR; the Sources table at the bottom cites the exact places each
fact comes from. Where this doc and the explorer source disagree, the source
wins — fix the doc.

Consumers: the staking repo's Go-served pages (staking browser,
staking-signer watch UI, dashboards) emulate this system through
`pkg/webstyle` — same tokens, same layering, same typography. A pointer stub
at the old location (`core/staking/docs/design/explorer-ui-style.md`) leads
here; moved 2026-08-05 (#71).

The explorer is React + Ant Design v5 (`ConfigProvider`, light/dark
algorithm). Non-antd pages must **emulate the visual system**: same tokens,
same layering, same typography.

---

## 1. Themes

Two first-class themes, switched by `data-theme="light" | "dark"` on the
**root `<html>` element** (`document.documentElement.dataset.theme`). No
`prefers-color-scheme`-only styling: the attribute is the authority.
Every surface, border, and text color must be defined for both themes —
a white panel inside a dark app is the canonical failure this system
exists to prevent.

## 2. Typography

| Role | Stack |
|---|---|
| UI text | `'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| Data — hashes, URLs, amounts, counts, code | `'IBM Plex Mono', Monaco, Menlo, Consolas, 'Courier New', monospace` |

Load: Google Fonts, IBM Plex Sans + Mono, weights 400/500. (A self-hosted
page that can't reach Google Fonts falls back through the stack — fine.)

Rules:
- **Anything an operator might copy is mono**: tx hashes, account URLs,
  nanoACME amounts, key hashes, block heights.
- Table headers: **uppercase**, `font-size: 13px`, `font-weight: 500`.
- Header/nav text: **uppercase**, `font-weight: 600`.
- Text hierarchy by alpha, not by grays: primary `0.88`, secondary `0.70`,
  decorative/disabled `0.50` — black-based in light
  (`rgba(0,0,0,α)`), white-based in dark (`rgba(255,255,255,α)`).

## 3. Color tokens

### Brand / accents (theme-independent)

| Token | Value | Use |
|---|---|---|
| `primary` | `#1890ff` | icons, active states, links (light), focus |
| `header-bg` | `#0958d9` | app header (mainnet) — antd blue-7 |
| `header-bg-testnet` | `#2d1640` | header when pointed at testnet |
| `header-bg-local` | `#4b0000` | header when pointed at a local/dev net |
| `success` | `#52c41a` | success/online/live status |
| `error` | `#ff4d4f` | errors, refusals |
| `link-dark` / `link-dark-hover` | `#69b1ff` / `#91caff` | links in dark mode (default antd dark link is too muted) |

The header color IS the network indicator: blue = mainnet, dark purple =
testnet, dark red = local. A signer UI pointed at Kermit must not look
like one pointed at mainnet.

### Light theme surfaces

| Token | Value |
|---|---|
| body | `#f0f0f0` |
| card / table / panel | `#ffffff` |
| table header strip | `#ececec` |
| alt (even) row | `#f5f5f5` |
| row hover | `#bae0ff` (accent blue — hover keeps the brand) |
| code/pre block | `#fcfcfc`, ring `0 0 0 1px #f0f0f0` |
| borders: rows | `#dfdfdf` |
| borders: surface outline | `1px solid #dfdfdf` (hard outline on every card/table container) |
| text | `rgba(0,0,0,.88)` / `.70` / `.50` |

### Dark theme surfaces

| Token | Value |
|---|---|
| body | `#000` |
| card / table / panel | `#1f1f1f` |
| table header strip | `#141414` (deepest) |
| alt (even) row | `#262626` |
| row hover | `#303030` |
| code/pre block | `#1f1f1f`, ring `0 0 0 1px #303030` |
| inner panels (tabs content, entry content) | `#141414` |
| borders: surface outline | `1px solid rgba(255,255,255,.55)` |
| text | `rgba(255,255,255,.88)` / `.70` / `.50` (headings `.85`) |

## 4. Depth and layering

Three layers, always distinguishable: **page → container → row**. Never
let them blend into one gray blob.

- Light: containers lift with
  `box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 2px 6px rgba(0,0,0,.08)`.
- Dark: bevel —
  `box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 2px 6px rgba(0,0,0,.45)`.
- Scrolling regions signal overflow with inset fades:
  light `inset 0 ±8px 8px -8px rgba(0,0,0,.18)`, dark same at `.55`.
- Hovered rows get a pressable inset highlight:
  light `inset 0 1px 0 rgba(255,255,255,.5)`, dark at `.08`.

## 5. Header

- Full-width bar, `padding: 0 20px`, background per network (see tokens).
- **Everything in it is white, weight 600** — text, links, icons. No
  exceptions, pinned hard.
- Nav item hover/active: `rgba(255,255,255,.22)` pill, `border-radius: 6px`.
- Logo: 38×38 in a solid white circle (white halo, `border-radius: 50%`,
  6px padding).
- Right side, ≥600px wide: network badge — fill `rgba(255,255,255,.08)`,
  border `rgba(255,255,255,.2)`; a live network shows a `#52c41a` status
  dot with a 1.2s pulse ring.
- Header action buttons: transparent fill, `2px solid #fff` border, white
  600 text; hover fills `rgba(255,255,255,.22)`.

## 6. Layout

- Content column: centered, `max-width: 1600px`; full-width below that.
- Content padding: top 25px, right 20px, bottom 15px, left
  `max(env(safe-area-inset-left), 20px)`.
- Section spacing: ~25px between blocks (`margin-bottom: 25px`).

## 7. Components

**Stat cards** (dashboard numbers): body `padding: 18px 24px 16px`,
`min-height: 121px`, hard 1px outline (per theme), icon `#1890ff` 24px
above the number, label in secondary alpha. Numbers in mono.

**Count pill** (e.g. "1,234" beside a heading): mono, `padding: 5px 8px`,
`border-radius: 5px`, `font-size: 14px`; light = white bg with
`box-shadow: 0 0 0 1px #000`; sits inline after the title.

**Featured / callout box**: `background: #e6f7ff`, `border: 1px solid
#91d5ff`, `border-left: 5px solid #91d5ff`, `padding: 10px 20px`. (The
info-blue family: `#e6f7ff` bg / `#91d5ff` border / `#096dd9` text.)

**Tags / badges** — antd Tag idiom, semantic colors:
| Meaning | Color |
|---|---|
| active / registered / good | green (`#52c41a` family) |
| informational / alt type | cyan |
| error / refused / invalid | red (`#ff4d4f` family) |
| inactive / scratch / muted | gray |

**Type chips** (the extid/key two-part chip): type segment colored —
ASCII `#001529` (near-black navy, white text), Hex/Base64/JSON `#1a7eea`
(blue, white text), key-type `#e6f7ff` bg + `#91d5ff` border + `#096dd9`
text; value segment white (dark: `#141414`) with `#d9d9d9` border, mono
for hex/base64.

**Error rows** (tables): light `hsl(8,100%,97%)` bg (hover/expanded
`hsl(8,100%,95%)`), dark `hsl(8,30%,18%)`; error icon `#ff4d4f`.

**Icons**: inline icons ride at `vertical-align: middle` with small
negative top margins (−2/−3px); decorative icons in rows at `opacity: .5`;
accent icons `#1890ff`.

**Secondary annotations** (e.g. a formatted balance under a raw value):
`font-size: 12px; color: #8c8c8c`.

## 8. Application to staking surfaces

Mapping current staking-signer watch-UI elements onto this system:

| Watch-UI element | Explorer idiom |
|---|---|
| page | body `#f0f0f0`/`#000` per theme, content column ≤1600px |
| cards ("Status", "Vault", "Period N") | stat cards: white/`#1f1f1f`, hard 1px outline, drop-shadow/bevel |
| state badge (watching / READY / REFUSED / SIGNED) | Tag colors: gray / green / red / blue |
| SIGNING DISABLED banner | error styling — `#ff4d4f` family, not a bespoke maroon |
| txids, budgets, pubkeys, sign command | IBM Plex Mono |
| card titles ("STATUS", "VAULT") | uppercase 13px/500 — same as table headers |
| refusal boxes | error-row tints (`hsl(8,…)` light / `hsl(8,30%,18%)` dark) |
| recent-polls table | full table spec: `#ececec`/`#141414` header, alt rows, blue hover, `#dfdfdf`/`#303030` dividers |
| header (add one) | network-colored bar — blue mainnet / purple testnet / red local — white 600 text; this replaces the plain `<h1>` |
| theme | implement BOTH themes via `data-theme` on root; a toggle or OS-follow default |

**Implementation: `pkg/webstyle`** — the one shared stylesheet (served at
`/static/style.css`, `//go:embed`) implementing these tokens as CSS custom
properties for both themes. Pages link it and keep only page-specific
layout; do not fork tokens into page-local `<style>` blocks — that is how
the surfaces drifted apart. Status (staking issue #387): the watch UI is
fully on it (both themes, network header); the staking browser's pages link
it and have had their navy/green palette remapped to the dark tokens — they
remain dark-only; the light theme + toggle there, and
`internal/progress_server.go` + `internal/daemon/dashboard.go`, are
follow-up.

## 9. Browser tab identity — every tool

Operators run several Accumulate tools at once, often against more than one
network; the tab strip is a UI surface too. Two channels, mirroring the
page header (§3), reviewed against every combination and settled:

- **The ground is the network — in favicon-specific tokens.** The header's
  tokens fail at 16px (testnet/local collapse to black squares; the header
  blue sits too close to a legible purple), so the favicon uses the same
  hue family at tab-legible strength:

  | Network | Header (§3) | Favicon ground |
  |---|---|---|
  | mainnet | `#0958d9` | `#1890ff` |
  | testnet | `#2d1640` | `#531dab` |
  | local/devnet | `#4b0000` | `#a8071a` |

  A tool that is **not bound to any network** supplies its own fixed
  ground instead — DTRules' "network color" IS orange (`#fa8c16`),
  always, with no network title suffix.
- **The mark is the tool's shape, in white — on every ground.** One
  system, no per-ground color tuning: the review of colored marks against
  these saturated grounds ended with white winning everywhere. Marks are
  drawn SVG paths (or a plain capital letter with
  `font-family='sans-serif'`; never symbol characters, which shift per
  platform). Interior cutouts (the wallet clasp, the keyhole) are drawn
  in the ground color and follow it.
- **The favicon must change when the user changes network.** A tool that
  switches networks in-app (the explorer's network selector, the wallet)
  swaps the favicon and `<meta name="theme-color">` live, together with
  its header color. Tools that know their network at serve time bake it
  in. (Explorer implementation: follow-up under #36 — its static PNGs
  predate this rule.)
- Title convention: `<subject> | <Tool>` on mainnet;
  `<subject> | <Tool> · <Network>` elsewhere.
- `<meta name="theme-color">` = the header color (§3), which tints
  browser chrome, not the tab icon.

### The marks

| Tool | Mark (white) |
|---|---|
| Explorer | the Accumulate star — the real `src/logo.svg` path, large and thickened |
| Wallet WebUI | wallet with clasp cutout |
| Staking Browser | token stack (three bars) |
| Staking-Signer Watch | oval with a keyhole — the signer holds the key |
| Reports Dashboard | ascending bar chart |
| ANAF Dashboard | bold capital A |
| Staking Requests | inbox tray with incoming arrow |
| DTRules Editor | decision table — header row, two branch cells, one dimmed — on its fixed orange ground |

### Favicons — copy-paste, all combinations

One `<link>` per tool per network; serve the one matching the active
network and swap it on network change.

```html
<!-- ═══ mainnet — ground #1890ff ═══ -->
<!-- Explorer -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%231890ff'/><g transform='translate(4.2 3.7) scale(0.268)'><path d='M59,4a8,8,0,1,0,8,8A8,8,0,0,0,59,4ZM23,22a8,8,0,1,0,8,8A8,8,0,0,0,23,22Zm72,0a8,8,0,1,0,8,8A8,8,0,0,0,95,22ZM57,23.82V38.18a11.2,11.2,0,0,1,4,0V23.82a11.2,11.2,0,0,1-4,0ZM83.7,34,68.36,42.51A12,12,0,0,1,70.3,46l15.34-8.52A11.75,11.75,0,0,1,83.7,34ZM34.29,34a11.85,11.85,0,0,1-1.95,3.49l15.31,8.62a12.1,12.1,0,0,1,1.9-3.52ZM59,42a8,8,0,1,0,8,8A8,8,0,0,0,59,42ZM47.68,53.93,32.35,62.5A12,12,0,0,1,34.3,66l15.3-8.55A12,12,0,0,1,47.68,53.93Zm22.59.16a12.67,12.67,0,0,1-.84,1.83h0a12.48,12.48,0,0,1-1.12,1.64L83.69,66a12.32,12.32,0,0,1,1.93-3.5ZM57,61.82V76.18a11.2,11.2,0,0,1,4,0V61.82a11.2,11.2,0,0,1-4,0ZM23,62a8,8,0,1,0,8,8A8,8,0,0,0,23,62Zm72,0a8,8,0,1,0,8,8A8,8,0,0,0,95,62ZM59,80a8,8,0,1,0,8,8A8,8,0,0,0,59,80Z' transform='translate(-15 -4)' fill='white' stroke='white' stroke-width='6' stroke-linejoin='round'/></g></svg>">
<!-- Wallet WebUI -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%231890ff'/><rect x='6' y='9' width='20' height='15' rx='3' fill='white'/><rect x='17' y='13.5' width='9' height='6' rx='3' fill='%231890ff'/><circle cx='21.5' cy='16.5' r='1.6' fill='white'/></svg>">
<!-- Staking Browser -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%231890ff'/><rect x='8' y='7.5' width='16' height='4.5' rx='2.25' fill='white'/><rect x='8' y='13.75' width='16' height='4.5' rx='2.25' fill='white'/><rect x='8' y='20' width='16' height='4.5' rx='2.25' fill='white'/></svg>">
<!-- Staking-Signer Watch -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%231890ff'/><ellipse cx='16' cy='16' rx='8.5' ry='11' fill='white'/><circle cx='16' cy='13' r='4' fill='%231890ff'/><path d='M14.2 15.6 L12.2 23.5 L19.8 23.5 L17.8 15.6 Z' fill='%231890ff'/></svg>">
<!-- Reports Dashboard -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%231890ff'/><rect x='7' y='17' width='4.5' height='7' rx='1.5' fill='white'/><rect x='13.75' y='12' width='4.5' height='12' rx='1.5' fill='white'/><rect x='20.5' y='7' width='4.5' height='17' rx='1.5' fill='white'/></svg>">
<!-- ANAF Dashboard -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%231890ff'/><text x='16' y='23.5' font-family='sans-serif' font-size='21' font-weight='700' text-anchor='middle' fill='white'>A</text></svg>">
<!-- Staking Requests -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%231890ff'/><line x1='16' y1='5.5' x2='16' y2='10.5' stroke='white' stroke-width='2.5'/><path d='M11.8 9.5 L16 14.5 L20.2 9.5 Z' fill='white'/><path d='M6.5 16 L6.5 22.5 Q6.5 25 9 25 L23 25 Q25.5 25 25.5 22.5 L25.5 16 L20.5 16 Q20.5 19.5 16 19.5 Q11.5 19.5 11.5 16 Z' fill='white'/></svg>">
```

```html
<!-- ═══ testnet — ground #531dab ═══ -->
<!-- Explorer -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23531dab'/><g transform='translate(4.2 3.7) scale(0.268)'><path d='M59,4a8,8,0,1,0,8,8A8,8,0,0,0,59,4ZM23,22a8,8,0,1,0,8,8A8,8,0,0,0,23,22Zm72,0a8,8,0,1,0,8,8A8,8,0,0,0,95,22ZM57,23.82V38.18a11.2,11.2,0,0,1,4,0V23.82a11.2,11.2,0,0,1-4,0ZM83.7,34,68.36,42.51A12,12,0,0,1,70.3,46l15.34-8.52A11.75,11.75,0,0,1,83.7,34ZM34.29,34a11.85,11.85,0,0,1-1.95,3.49l15.31,8.62a12.1,12.1,0,0,1,1.9-3.52ZM59,42a8,8,0,1,0,8,8A8,8,0,0,0,59,42ZM47.68,53.93,32.35,62.5A12,12,0,0,1,34.3,66l15.3-8.55A12,12,0,0,1,47.68,53.93Zm22.59.16a12.67,12.67,0,0,1-.84,1.83h0a12.48,12.48,0,0,1-1.12,1.64L83.69,66a12.32,12.32,0,0,1,1.93-3.5ZM57,61.82V76.18a11.2,11.2,0,0,1,4,0V61.82a11.2,11.2,0,0,1-4,0ZM23,62a8,8,0,1,0,8,8A8,8,0,0,0,23,62Zm72,0a8,8,0,1,0,8,8A8,8,0,0,0,95,62ZM59,80a8,8,0,1,0,8,8A8,8,0,0,0,59,80Z' transform='translate(-15 -4)' fill='white' stroke='white' stroke-width='6' stroke-linejoin='round'/></g></svg>">
<!-- Wallet WebUI -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23531dab'/><rect x='6' y='9' width='20' height='15' rx='3' fill='white'/><rect x='17' y='13.5' width='9' height='6' rx='3' fill='%23531dab'/><circle cx='21.5' cy='16.5' r='1.6' fill='white'/></svg>">
<!-- Staking Browser -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23531dab'/><rect x='8' y='7.5' width='16' height='4.5' rx='2.25' fill='white'/><rect x='8' y='13.75' width='16' height='4.5' rx='2.25' fill='white'/><rect x='8' y='20' width='16' height='4.5' rx='2.25' fill='white'/></svg>">
<!-- Staking-Signer Watch -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23531dab'/><ellipse cx='16' cy='16' rx='8.5' ry='11' fill='white'/><circle cx='16' cy='13' r='4' fill='%23531dab'/><path d='M14.2 15.6 L12.2 23.5 L19.8 23.5 L17.8 15.6 Z' fill='%23531dab'/></svg>">
<!-- Reports Dashboard -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23531dab'/><rect x='7' y='17' width='4.5' height='7' rx='1.5' fill='white'/><rect x='13.75' y='12' width='4.5' height='12' rx='1.5' fill='white'/><rect x='20.5' y='7' width='4.5' height='17' rx='1.5' fill='white'/></svg>">
<!-- ANAF Dashboard -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23531dab'/><text x='16' y='23.5' font-family='sans-serif' font-size='21' font-weight='700' text-anchor='middle' fill='white'>A</text></svg>">
<!-- Staking Requests -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23531dab'/><line x1='16' y1='5.5' x2='16' y2='10.5' stroke='white' stroke-width='2.5'/><path d='M11.8 9.5 L16 14.5 L20.2 9.5 Z' fill='white'/><path d='M6.5 16 L6.5 22.5 Q6.5 25 9 25 L23 25 Q25.5 25 25.5 22.5 L25.5 16 L20.5 16 Q20.5 19.5 16 19.5 Q11.5 19.5 11.5 16 Z' fill='white'/></svg>">
```

```html
<!-- ═══ local — ground #a8071a ═══ -->
<!-- Explorer -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23a8071a'/><g transform='translate(4.2 3.7) scale(0.268)'><path d='M59,4a8,8,0,1,0,8,8A8,8,0,0,0,59,4ZM23,22a8,8,0,1,0,8,8A8,8,0,0,0,23,22Zm72,0a8,8,0,1,0,8,8A8,8,0,0,0,95,22ZM57,23.82V38.18a11.2,11.2,0,0,1,4,0V23.82a11.2,11.2,0,0,1-4,0ZM83.7,34,68.36,42.51A12,12,0,0,1,70.3,46l15.34-8.52A11.75,11.75,0,0,1,83.7,34ZM34.29,34a11.85,11.85,0,0,1-1.95,3.49l15.31,8.62a12.1,12.1,0,0,1,1.9-3.52ZM59,42a8,8,0,1,0,8,8A8,8,0,0,0,59,42ZM47.68,53.93,32.35,62.5A12,12,0,0,1,34.3,66l15.3-8.55A12,12,0,0,1,47.68,53.93Zm22.59.16a12.67,12.67,0,0,1-.84,1.83h0a12.48,12.48,0,0,1-1.12,1.64L83.69,66a12.32,12.32,0,0,1,1.93-3.5ZM57,61.82V76.18a11.2,11.2,0,0,1,4,0V61.82a11.2,11.2,0,0,1-4,0ZM23,62a8,8,0,1,0,8,8A8,8,0,0,0,23,62Zm72,0a8,8,0,1,0,8,8A8,8,0,0,0,95,62ZM59,80a8,8,0,1,0,8,8A8,8,0,0,0,59,80Z' transform='translate(-15 -4)' fill='white' stroke='white' stroke-width='6' stroke-linejoin='round'/></g></svg>">
<!-- Wallet WebUI -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23a8071a'/><rect x='6' y='9' width='20' height='15' rx='3' fill='white'/><rect x='17' y='13.5' width='9' height='6' rx='3' fill='%23a8071a'/><circle cx='21.5' cy='16.5' r='1.6' fill='white'/></svg>">
<!-- Staking Browser -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23a8071a'/><rect x='8' y='7.5' width='16' height='4.5' rx='2.25' fill='white'/><rect x='8' y='13.75' width='16' height='4.5' rx='2.25' fill='white'/><rect x='8' y='20' width='16' height='4.5' rx='2.25' fill='white'/></svg>">
<!-- Staking-Signer Watch -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23a8071a'/><ellipse cx='16' cy='16' rx='8.5' ry='11' fill='white'/><circle cx='16' cy='13' r='4' fill='%23a8071a'/><path d='M14.2 15.6 L12.2 23.5 L19.8 23.5 L17.8 15.6 Z' fill='%23a8071a'/></svg>">
<!-- Reports Dashboard -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23a8071a'/><rect x='7' y='17' width='4.5' height='7' rx='1.5' fill='white'/><rect x='13.75' y='12' width='4.5' height='12' rx='1.5' fill='white'/><rect x='20.5' y='7' width='4.5' height='17' rx='1.5' fill='white'/></svg>">
<!-- ANAF Dashboard -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23a8071a'/><text x='16' y='23.5' font-family='sans-serif' font-size='21' font-weight='700' text-anchor='middle' fill='white'>A</text></svg>">
<!-- Staking Requests -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23a8071a'/><line x1='16' y1='5.5' x2='16' y2='10.5' stroke='white' stroke-width='2.5'/><path d='M11.8 9.5 L16 14.5 L20.2 9.5 Z' fill='white'/><path d='M6.5 16 L6.5 22.5 Q6.5 25 9 25 L23 25 Q25.5 25 25.5 22.5 L25.5 16 L20.5 16 Q20.5 19.5 16 19.5 Q11.5 19.5 11.5 16 Z' fill='white'/></svg>">
```

```html
<!-- ═══ DTRules Editor — fixed ground, every network ═══ -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23fa8c16'/><rect x='7.5' y='7.5' width='17' height='5' rx='1.5' fill='white'/><rect x='7.5' y='14.5' width='8' height='10' rx='1.5' fill='white'/><rect x='16.5' y='14.5' width='8' height='10' rx='1.5' fill='white' opacity='.55'/></svg>">
```

Adding a new tool? Design a one-concept drawn mark, render it white on
the three grounds, and add the row and snippets here.

## 10. Sources

| Fact | Source |
|---|---|
| Fonts, content padding, header colors, hover pills, logo halo | `src/App.css:1-110, 683-757` |
| antd theme tokens, dark algorithm, `data-theme` attr, dark link colors | `src/components/common/ThemeProvider.tsx` |
| Body colors, base font stack | `src/index.css` |
| Text-alpha hierarchy, stat cards, hard outlines | `src/App.css:152-175` |
| Surface layering (both themes), row/hover/alt colors, borders | `src/App.css:1135-1230` |
| Depth: shadows, bevels, scroll fades, hover elevation | `src/App.css:1232-1308` |
| Count pill, featured box, type chips, error rows | `src/App.css:277-296, 776-786, 497-580, 1040-1057` |
| Tag semantics (green/cyan/red/gray) | `src/components/**/*.jsx` Tag usage |
| Uppercase table headers 13/500; nav uppercase | `src/App.css:355-359, 651-654` |
| Tab identity (§9) | this doc is the source; tools implement it |
