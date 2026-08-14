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
rsync -az --delete --exclude='*.map' build/ server1:/var/www/explorer/
ssh server1 'chown -R ubuntu:ubuntu /var/www/explorer'

# 4. Verify — the served bundle name must match the one in build/index.html
grep -o 'index-[A-Za-z0-9_-]*\.js' build/index.html
curl -s https://explorer.accumulatenetwork.io/ | grep -o 'index-[A-Za-z0-9_-]*\.js'
```

Then load https://explorer.accumulatenetwork.io in a browser (or run the smoke
script in `scripts/`) and check a transaction page, an account page, and
`/staking`.

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

Caveats:

- Beta's DNS is **IPv6-only**; from an IPv4-only network it cannot be reached,
  which is not a deployment failure.
- The mirror's branches have historically diverged from GitLab by line-ending
  duplicate commits; if a push is rejected, use `--force-with-lease`.

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
