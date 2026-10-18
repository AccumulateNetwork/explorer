# HANDOFF — explorer

**Generated:** 2026-07-21
**Reason:** 76-fun Thelio to System76 for NVMe repair; work continues elsewhere.
**Repo path on origin machine:** /home/paul/go/src/gitlab.com/AccumulateNetwork/explorer
**Remote:** two remotes —
  `origin` git@gitlab.com:accumulatenetwork/ecosystem/explorer.git (primary dev, CI, issues)
  `github` git@github.com:AccumulateNetwork/explorer.git (deploy mirror; Netlify watches it)

## 1. What this repo is

The Accumulate block explorer: a React 18 + TypeScript + Vite 5 + Ant Design 5 single-page app
(`src/`) that browses accounts, transactions, blocks, tokens and validators across mainnet,
Kermit and Fozzie testnets, and local devnet, with network-health indicators and Web3 wallet
(MetaMask / WalletConnect) integration. It also carries a Go module
(`gitlab.com/accumulatenetwork/explorer`) for an MCP server (`mcp/`) and a `metrics-service/`.
Production is https://explorer.accumulatenetwork.io and beta is
https://beta.explorer.accumulatenetwork.io, both auto-deployed by Netlify from the GitHub mirror.

## 2. Current work in flight

**Feature: a network-aware in-Explorer wallet panel driven by the local Accumulate wallet
daemon** — branch `feat/wallet-network-aware`, last commits 2026-07-18. This is the front-end
half of a paired effort; the wallet repo
(`~/go/src/gitlab.com/AccumulateNetwork/wallet`, branch `feat/webui-pinentry-unlock`) is the
back-end half and was worked in the same sessions. Read both handoffs together.

The arc, newest last:

- Phase 0–5 groundwork (already pushed): typecheck gate in CI, a local-wallet build profile with
  a dev proxy, Vitest plus first unit tests, React 18 upgrade, react-router v6 migration, and a
  rebuild of the wallet panel against the real wallet API.
- `dd510dc` — wallet: lazy, **network-aware** panel; the unlock prompt is named for the network,
  so a Kermit wallet is visibly not the mainnet wallet.
- `4dd46c5` / `962ae6f` — the panel stops collecting a passphrase in the browser. It relies on
  the wallet's **native pinentry prompt** for locked vaults and skips the prompt entirely for
  `--no-password` wallets.
- `39f2f98` (unpushed) — **key search / list / generate** in the wallet faucet: new methods in
  `src/components/wallet/WalletClient.ts` (+ tests in `WalletClient.test.ts`), context wiring in
  `Context.tsx`, and ~80 lines of new UI in `WalletPanel.tsx`.
- `9cab96a` (unpushed, HEAD) — surfaces that same key search/list/generate **on the Explorer
  faucet page**: `src/components/explorer/Faucet.tsx` (+151/-…, the bulk of the change),
  `WalletDock.tsx`, `WalletPanel.tsx`, `Explorer.tsx`.

Two older threads are parked, not active:

- `issue/19-tx-enrich` holds an unpushed `wip: tx-row enrichment prototype for MinorBlocks`.
- The `issue/5-dark-mode` line and its `worker-issue-6/7/8` siblings hold unpushed dark-mode and
  wallet-daemon-port fixes that were never merged forward (see section 3).

## 3. State at handoff

- **Branch:** `feat/wallet-network-aware` (upstream: `origin/feat/wallet-network-aware`, ahead 2)
- **Uncommitted changes:** 2 entries, both **untracked** (no tracked file is modified)
  - `CLAUDE.md` — the project's Claude instructions file; written but never committed. Contents
    summarized in section 4. **This is real content that exists only on this disk.**
  - `.claude/` — untracked directory. It contains **no settings/agents/skills**; its only content
    is `.claude/worktrees/issue-21-infinite-list`, a full **git worktree** (checked out on branch
    `develop`, working tree clean, and carrying its own `node_modules/`). See the warning in §6.
- **Unpushed commits:** 12 (deduplicated across branches; complete list, not truncated)
  - `9cab96a` Put wallet key search/list/generate on the Explorer faucet page *(feat/wallet-network-aware)*
  - `39f2f98` Add key search/list/generate to the wallet faucet *(feat/wallet-network-aware)*
  - `93f158e` webui dev proxy: default to wallet port 8437 (off 8080) *(feat/phase4-router-v6)*
  - `e6a749f` wip: tx-row enrichment prototype for MinorBlocks *(issue/19-tx-enrich)*
  - `9e3183e` worker-issue-8: Fix dark mode dropdown contrast *(issue/5-dark-mode)*
  - `b201042` worker-issue-7: Add dark mode styling for wallet panel drawer
  - `37fe749` worker-issue-6: Fix wallet daemon connection port
  - `2dcbbad` worker-issue-6: Fix wallet daemon connection port *(issue/worker-issue-6)*
  - `4f7fadb` worker-issue-8: Fix dark mode dropdown contrast *(issue/worker-issue-8)*
  - `6f383fd` worker-issue-7: Add dark mode styling for wallet panel drawer *(issue/worker-issue-7)*
  - `5e959a6` Merge wallet panel from issue/4-copyright-2026
  - `ea2e496` Merge wallet features from github/develop and fix dark mode
- **Recent commits:**
```
9cab96a Put wallet key search/list/generate on the Explorer faucet page
39f2f98 Add key search/list/generate to the wallet faucet
962ae6f wallet panel: rely on native unlock prompt for locked vaults
4dd46c5 wallet panel: native (pinentry) unlock + skip prompt for no-password wallets
dd510dc wallet: lazy, network-aware panel with network-named unlock prompt
```

Other state worth knowing: this repo has ~33 local branches; `develop` (checked out in the
worktree) is **behind origin/develop by 13**.

## 4. Claude setup

**`CLAUDE.md` exists (52 lines) — but is UNTRACKED.** It will be lost if you re-clone instead of
copying the directory. Its directives:

- **Mandatory first action:** review `~/go/src/gitlab.com/AccumulateNetwork/tracking_repo/CLAUDE.md`
  for current development rules, file-naming standards, and TDD requirements.
- **Mandatory orchestrator:** all work goes through `orch` (`orch start 25 explorer`,
  `orch status`, `orch commit`, `orch mr`, `orch finish`).
- **Use the tracking MCP server** for project management and standards enforcement, at three
  gates: before starting work call the `start-new-issue` prompt and `find-docs`; before commits
  call `pre-commit-check` and `verify-test-coverage` (80% threshold); before an MR call
  `pre-mr-validation` and `verify-issue-status`. Its tools are listed as `verify-issue-status`,
  `validate-filename`, `check-test-first`, `verify-test-coverage`, `query-issues`,
  `generate-report`, `find-docs`.
- **File naming:** never ALL_CAPS filenames; always lowercase-with-hyphens. (The repo itself
  violates this heavily — `DEPLOYMENT.md`, `TESTING.md`, `HOTFIX-*.md` etc. predate the rule.
  This HANDOFF.md is an explicit exception requested for the machine transfer.)

**`.claude/` exists but holds no Claude configuration** — no `agents/`, no `skills/`, no
`commands/`, no `settings.json`, no `settings.local.json`. Its sole content is a git worktree
parked under `.claude/worktrees/issue-21-infinite-list`.

**No `.mcp.json`** in this repo, so the tracking MCP server referenced by CLAUDE.md is registered
out-of-band (user-level Claude config), not in the repo — it will not transfer with these files.
The `mcp/` directory is this project's *own* Accumulate MCP server source, not a client config.

Separately, `AI-README.md` is a maintained AI-oriented quick reference (deployment, architecture,
remotes) and is the best single file to read after this one.

## 5. Directives and conventions

**Build and test (verified in `package.json` — these are the only scripts defined):**

```bash
npm install          # or yarn; both package-lock.json and yarn.lock are present
npm start            # VITE_NETWORK=any vite dev
npm run check        # tsc  — this is the typecheck gate CI enforces
npm test             # vitest run
npm run test:watch   # vitest
npm run build        # vite build
npm run preview      # VITE_NETWORK=any vite build && vite preview
npm run format       # prettier -w src
npm run check:format # prettier src
```

There is **no Makefile**. Go tooling exists only for `mcp/` and `metrics-service/` (Go 1.24.4).

**Deployment (from AI-README.md — do not improvise here):**

```bash
git push github develop:updates   # -> beta.explorer.accumulatenetwork.io
git push github develop:main      # -> explorer.accumulatenetwork.io
```

Netlify watches the **GitHub** mirror and auto-deploys; GitLab is the development/CI/issue home.
This two-remote split is the single most important operational fact about this repo.

**Branch policy:** `develop` is the integration branch; feature work lives on `issue/<n>-<slug>`,
`feat/…`, `fix/…`, `chore/…` branches and merges to `develop` via GitLab MRs. Commit messages in
recent history follow conventional commits with a scope — `fix(common):`, `refactor(account):`,
`style:` — often with a trailing `(#nn)` issue reference; older commits are free-form.

**Wallet integration convention:** the dev proxy targets the local wallet daemon on port
**8437** (deliberately moved off 8080); the local-wallet build profile is selected with
`VITE_WALLET=local`, and `VITE_NETWORK=any` enables the network switcher.

## 6. Resuming on another machine

1. Clone fresh — `git clone git@gitlab.com:accumulatenetwork/ecosystem/explorer.git` — and then
   re-add the deploy mirror: `git remote add github git@github.com:AccumulateNetwork/explorer.git`.
   A clone that lacks the `github` remote **cannot deploy**.
2. Before copying the directory off the external drive, understand what not to copy:
   `node_modules/`, `build/`, `build.log`, and the stale release tarballs in the repo root
   (`explorer-beta-build.tar.gz`, `explorer-production-20260222-*.tar.gz`) are large and
   worthless on the new machine.
3. **Carry `CLAUDE.md` across by hand.** It is untracked; a fresh clone will not contain it.
4. **Handle `.claude/worktrees/issue-21-infinite-list` carefully.** It is a git worktree, not a
   normal directory: its `.git` is a file containing the absolute path
   `/home/paul/go/src/gitlab.com/AccumulateNetwork/explorer/.git/worktrees/…`, which will be
   wrong on the new machine. Its branch `develop` is fully pushed (0 unpushed) and its working
   tree is clean, so **the simplest correct action is to not transfer it at all** and re-create
   it if needed with `git worktree add`. If you do copy it, run `git worktree repair` (or
   `git worktree prune` and re-add) before trusting it.
5. Check out the active branch: `git checkout feat/wallet-network-aware`. Its 2 commits are
   unpushed — push them from the old machine while it is still reachable, or rely on the
   directory copy.
6. **Rescue the other 10 unpushed commits** listed in section 3, especially the
   `issue/5-dark-mode` / `worker-issue-6/7/8` cluster and the `issue/19-tx-enrich` WIP; several
   of those branches have no upstream at all and exist only on this disk.
7. Install and verify: `npm install`, then `npm run check` (tsc must pass — it is a CI gate),
   then `npm test` (vitest), then `npm run build`. Node/npm are the only hard requirements for
   the front end; Go 1.24+ only if you touch `mcp/` or `metrics-service/`.
8. Pick up where section 2 left off: finish and push the faucet-page key search/list/generate
   work, and open the MR **in lockstep with the wallet repo's `feat/webui-pinentry-unlock`
   branch** — the panel is useless without the wallet-side `wallet.GenerateKey` and auto-unlock
   API commits, which are also unpushed on the other repo.

**Will NOT transfer — machine-specific:**

- **SSH keys are gone.** `~/.ssh` retains only `known_hosts`; `~/.aws` and the GPG private keys
  were removed. Both `git@gitlab.com:` and `git@github.com:` remotes will fail until a new key is
  generated and registered with **both** GitLab and GitHub. Deployment depends on the GitHub key
  specifically.
- **The local wallet daemon on `localhost:8437` does not exist elsewhere.** The entire in-flight
  feature is driven by it. You must build and run the sibling wallet repo's webui/daemon on the
  new machine before the wallet panel or the faucet key tools do anything.
- **Native pinentry.** The unlock flow deliberately delegates to the OS pinentry dialog via the
  wallet daemon. With `~/.gnupg` removed and on a different desktop session, expect to
  reconfigure pinentry before locked-vault unlock works end to end.
- **The tracking MCP server** required by CLAUDE.md is registered in user-level Claude config, not
  in this repo, and `tracking_repo` is a separate sibling repository at
  `~/go/src/gitlab.com/AccumulateNetwork/tracking_repo/` — transfer it too or CLAUDE.md's
  mandatory first step is unfollowable.
- **The `orch` binary is not on PATH even on this machine**, despite CLAUDE.md mandating it. Do
  not assume the orchestrator workflow is available.
- **The worktree path** `/home/paul/go/src/gitlab.com/AccumulateNetwork/explorer/.git/worktrees/…`
  is absolute and will break (see step 4).
- **Netlify credentials / site config** are not in this repo; deployment works purely by pushing
  to the GitHub mirror, so restoring GitHub SSH access is what matters.
