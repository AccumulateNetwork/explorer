# Explorer Deployment Guide

**Last Updated:** 2026-08-04 (verified against the live infrastructure during the 0.4.2 deploy)

Beta and production are hosted on **different infrastructure**. They must not be
confused: beta deploys itself, production does not.

| Site       | URL                                        | Hosting                                 | Deploys when                 |
| ---------- | ------------------------------------------ | --------------------------------------- | ---------------------------- |
| Beta       | https://beta.explorer.accumulatenetwork.io | Netlify (`accumulate-beta.netlify.app`) | GitHub mirror is pushed      |
| Production | https://explorer.accumulatenetwork.io      | nginx on server1 (206.191.154.164)      | someone rsyncs a build there |

---

## Production (nginx, manual)

`explorer.accumulatenetwork.io` resolves to server1 and is served by nginx
(`/etc/nginx/sites-enabled/explorer-main`) from `/var/www/explorer`. **Pushing
to GitHub deploys nothing here.** The cost of believing otherwise: production
served the 2026-04-23 build until 2026-07-29 while three months of fixes were
"deployed" to a mirror nobody serves.

```bash
# 1. Build. VITE_NETWORK=any is REQUIRED — production runs with the network
#    selector; a build without it hard-fails at runtime asking for a network.
VITE_NETWORK=any npm run build

# 2. Back up the current deployment (server1 is defined in ~/.ssh/config)
ssh server1 'cd /var/www && tar -czf /root/explorer-backup-$(date +%Y%m%d-%H%M%S).tar.gz explorer'

# 3. Deploy. Exclude the source maps: the build emits them 'hidden' (not
#    referenced from the bundle) for local debugging, but they carry full
#    sourcesContent and must not be served publicly (#48).
#    --delete-excluded is required, not optional: --exclude also protects
#    matching files on the server from --delete, so maps from an earlier
#    deploy would survive every future one. They were still fetchable after
#    the first excluded deploy until this was added.
rsync -az --delete --delete-excluded --exclude='*.map' build/ server1:/var/www/explorer/
ssh server1 'chown -R ubuntu:ubuntu /var/www/explorer'

# 4. Verify — the served bundle name must match the one in build/index.html
grep -o 'index-[A-Za-z0-9_-]*\.js' build/index.html
curl -s https://explorer.accumulatenetwork.io/ | grep -o 'index-[A-Za-z0-9_-]*\.js'
```

Then load https://explorer.accumulatenetwork.io in a browser (or run the smoke
script in `scripts/`) and check a transaction page, an account page, and
`/staking`.

### Security headers and CSP

The vhosts include `snippets/explorer-security.conf`, kept in this repo at
[`deploy/nginx/explorer-security.conf`](deploy/nginx/explorer-security.conf).
It carries `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy` and the Content Security Policy (#59). `netlify.toml`
declares a similar set but only covers beta; before this existed production
sent no security headers at all.

To update it:

```bash
scp deploy/nginx/explorer-security.conf server1:/etc/nginx/snippets/
ssh server1 'nginx -t && systemctl reload nginx'
curl -sI https://explorer.accumulatenetwork.io/ | grep -i content-security
```

The include appears in **every** location block as well as the server block:
nginx does not inherit `add_header` into a location that sets one of its own,
so the cache-control locations would silently lose the headers.

**The CSP is Report-Only.** It was validated against ten pages and the theme
toggle with no violations, but the wallet connect and signing flows cannot be
exercised headlessly and reach the most third-party origins. Connect a wallet
once, confirm the console reports no CSP violations, then promote by renaming
the header in the snippet:

```
Content-Security-Policy-Report-Only  ->  Content-Security-Policy
```

### Rollback

Backups from step 2 live in `/root/` on server1:

```bash
ssh server1 'cd /var/www && tar -xzf /root/explorer-backup-<timestamp>.tar.gz'
```

---

## Beta (Netlify, automatic)

Beta is the Netlify site `accumulate-beta.netlify.app` behind
`beta.explorer.accumulatenetwork.io`, built from the **GitHub mirror**
(`github.com/AccumulateNetwork/explorer`). Netlify runs `npm run build` with
`VITE_NETWORK=any` per `netlify.toml`, which also restricts builds to the
`main` branch.

```bash
git push github develop:main
```

Verify the mirror matches GitLab after pushing:

```bash
git ls-remote --heads github        # main and develop must both equal
git rev-parse origin/develop        # this
```

Caveats:

- Beta's DNS is **IPv6-only**; from an IPv4-only network it cannot be reached,
  which is not a deployment failure.
- **A rejected push to the mirror is a signal, not an obstacle.** GitLab is the
  only source of truth; nothing should ever land on the mirror that did not
  come from GitLab, so a non-fast-forward means someone else wrote to it.
  Inspect what is there — `git fetch github && git log --format='%an %ci %s'
  github/main` — before doing anything else.

> **This document previously said the mirror "has historically diverged from
> GitLab by line-ending duplicate commits" and to force past a rejected push
> with `--force-with-lease`. That advice is why the 2026-08-14 compromise went
> unnoticed:** an attacker replaced the `0.4.6` release commit with a copy
> carrying a remote-code-execution payload in `vite.config.js`, and because
> their commit had CRLF line endings it was indistinguishable from the
> "expected" line-ending divergence the reader had been told to force past.
> Treat the mirror as untrusted output, never as input.

---

## Repositories

```
origin  git@gitlab.com:accumulatenetwork/ecosystem/explorer.git   (primary: development, issues, CI)
github  git@github.com:AccumulateNetwork/explorer.git             (mirror: feeds Netlify beta)
```

Keep the mirror in sync when releasing — it is the beta deploy and the public
GitHub presence — but never mistake pushing it for a production deploy.

---

## Release checklist

1. Merge the work into `develop` (via MRs), all CI jobs green.
2. Bump `package.json` + `package-lock.json`, add a `changelog.md` entry.
3. Commit `chore: release X.Y.Z`, tag `vX.Y.Z`, push `develop` and the tag to origin.
4. Deploy beta: `git push github develop:main`, verify.
5. Deploy production: build/backup/rsync/verify as above.

---

## Metrics service

The staking/supply numbers come from a separate Go service
(`metrics-service/`, https://metrics.accumulatenetwork.io/v1). It is deployed
independently (`metrics-service/deploy.sh`) and is not part of an explorer
deploy.
