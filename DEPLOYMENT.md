# Explorer Deployment Guide

**Last Updated:** 2026-08-22 (beta re-verified against live DNS, TLS, and certificate transparency)

**There is one deployment target: production.** Beta no longer exists.

| Site       | URL                                        | Hosting                            | Deploys when                 |
| ---------- | ------------------------------------------ | ---------------------------------- | ---------------------------- |
| Production | https://explorer.accumulatenetwork.io      | nginx on server1 (206.191.154.164) | someone rsyncs a build there |
| ~~Beta~~   | ~~beta.explorer.accumulatenetwork.io~~     | **gone** — see below               | never                        |

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

## Beta (Netlify) — DECOMMISSIONED

**Beta is gone. Pushing the GitHub mirror deploys nothing.**

`accumulate-beta.netlify.app` returns Netlify's generic `Not Found`, and the
only certificate offered for `beta.explorer.accumulatenetwork.io` is Netlify's
`*.netlify.app` wildcard — no certificate covering the custom domain exists, so
the domain is not attached to any Netlify site.

Certificate transparency dates the shutdown. Netlify renewed a Let's Encrypt
certificate for the host every ~60 days without a gap from 2024 through
**2026-01-22**; the renewal due at the end of March never happened and the last
certificate expired **2026-04-22**. The last archived capture of the site is
2026-03-12. **Beta therefore died around March 2026 — roughly five months
before the 2026-08-14 mirror compromise, which means Netlify never built the
malicious commit and no Netlify build environment was exposed by it.**

`netlify.toml` is retained: it is the only record of the beta build
configuration, and it is inert without a Netlify site.

### Dangling DNS — needs removal

`beta.explorer.accumulatenetwork.io` is still a CNAME to the unclaimed
`accumulate-beta.netlify.app`. So is `bridge.accumulatenetwork.io`, to
`accumulate-bridge.netlify.app`. A CNAME pointing at an unclaimed provider
hostname is a **subdomain takeover**: whoever registers that name on Netlify
serves content on an `accumulatenetwork.io` subdomain, and the dangling CNAME
is itself the domain-control proof needed to get a valid certificate for it.
For a site whose users connect wallets, that is a ready-made phishing origin.

Delete both DNS records, or repoint them. Verify with:

```bash
curl -sI https://beta.explorer.accumulatenetwork.io | head -3   # expect: no resolution
curl -sI https://bridge.accumulatenetwork.io       | head -3
```

---

## Repositories

```
origin  git@gitlab.com:accumulatenetwork/ecosystem/explorer.git   (primary: development, issues, CI)
github  git@github.com:AccumulateNetwork/explorer.git             (mirror: public GitHub presence only)
```

The mirror is now **only** the public GitHub presence — it deploys nothing.
Keep it in sync when releasing so the public copy is not stale, and treat it as
output, never as input.

---

## Release checklist

1. Merge the work into `develop` (via MRs), all CI jobs green.
2. Bump `package.json` + `package-lock.json`, add a `changelog.md` entry.
3. Commit `chore: release X.Y.Z`, tag `vX.Y.Z`, push `develop` and the tag to origin.
4. Deploy production: build/backup/rsync/verify as above.
5. Sync the public mirror: `git push github develop:main develop:develop`, then
   confirm `git ls-remote --heads github` matches `git rev-parse origin/develop`.

---

## Metrics service

The staking/supply numbers come from a separate Go service
(`metrics-service/`, https://metrics.accumulatenetwork.io/v1). It is deployed
independently (`metrics-service/deploy.sh`) and is not part of an explorer
deploy.
