# Explorer - AI Quick Reference

> **For AI Assistants:** This document provides essential information about the Accumulate Explorer project in a format optimized for AI comprehension.

## Project Overview

**What:** Web-based blockchain explorer for Accumulate protocol
**Tech Stack:** React 17 + TypeScript 5 + Vite 5 + Ant Design 4
**Primary Repository:** GitLab (gitlab.com/accumulatenetwork/ecosystem/explorer)
**Mirror Repository:** GitHub (github.com/AccumulateNetwork/explorer)

## Deployment (MOST IMPORTANT)

Beta and production are hosted on **different infrastructure**. See
`DEPLOYMENT.md` for the full, verified procedure.

- **Production:** https://explorer.accumulatenetwork.io — nginx on server1
  (206.191.154.164), served from `/var/www/explorer`. Deployed **manually**:
  `VITE_NETWORK=any npm run build`, then rsync `build/` to
  `server1:/var/www/explorer/`. Pushing to GitHub does NOT deploy production.
- **Beta:** https://beta.explorer.accumulatenetwork.io — Netlify
  (`accumulate-beta.netlify.app`), auto-builds the GitHub mirror's `main`
  branch: `git push github develop:main`. Beta's DNS is IPv6-only.

### Why Two Repositories?

- **GitLab (origin):** Primary development, issue tracking, CI/CD
- **GitHub (github):** Mirror; feeds the Netlify beta site

### Git Remotes

```bash
origin  git@gitlab.com:accumulatenetwork/ecosystem/explorer.git
github  git@github.com:AccumulateNetwork/explorer.git
```

## Development

### Quick Start

```bash
npm install       # Install dependencies
npm start         # Dev server (localhost:3000)
npm run build     # Production build
npm run check     # TypeScript check
```

### Key Directories

```
src/
├── components/
│   ├── common/           # Shared components, network config
│   ├── account/          # Account views (TokenAccount.tsx, etc.)
│   ├── explorer/         # Explorer pages (Staking.jsx, etc.)
│   └── views/            # Page views
├── utils/                # Utility functions (getSupply.js, etc.)
└── sdk-patches.ts        # SDK compatibility patches

mcp/                      # MCP server for AI integration
metrics-service/          # Go metrics API service
```

### Important Files

- `src/components/common/networks.tsx` - Network configurations (mainnet, testnets)
- `src/utils/getSupply.js` - Fetches ACME supply metrics from API
- `src/components/explorer/Staking.jsx` - Staking page UI
- `netlify.toml` - Netlify configuration (headers, redirects)
- `.gitlab-ci.yml` - GitLab CI/CD (builds, optional deployment)

## Common Tasks

### Fix Display Issue (Example: Staking Tokens)

**Problem:** Staking page not showing staked tokens

**Diagnosis:**
1. Check browser console for errors
2. Check API response: `curl https://metrics.accumulatenetwork.io/v1/supply`
3. Check frontend code using that data

**Fix:**
1. Identify field name mismatch (e.g., `supply.stakedTokens` vs `supply.staked`)
2. Update frontend to use correct field name
3. Commit fix
4. Deploy beta (`git push github develop:main`), then rsync to production per DEPLOYMENT.md

### Metrics API

**Service:** Go service at `/metrics-service/`
**Production:** https://metrics.accumulatenetwork.io/v1
**Endpoints:**
- `/supply` - ACME supply metrics (staked, circulating, total)
- `/timestamp/{txid}` - Transaction timestamp
- `/staking/stakers/{url}` - Staking account info

**Deploy Metrics Service:**
```bash
cd metrics-service
./deploy.sh
```

## Network Configuration

### Networks

- **Mainnet:** https://mainnet.accumulatenetwork.io
- **Kermit Testnet:** https://kermit.accumulatenetwork.io
- **Fozzie Testnet:** https://fozzie.accumulatenetwork.io
- **Local Devnet:** http://127.0.0.1:26660

### Network Detection

Explorer auto-detects network from hostname:
- `explorer.accumulatenetwork.io` → Mainnet
- `beta.explorer.accumulatenetwork.io` → Mainnet (with latest features)
- `kermit.explorer.accumulatenetwork.io` → Kermit
- `localhost` → Last selected network

## Testing

**Quick Test:**
```bash
npm start
# Open http://localhost:3000
# Check console for errors
# Test network switching
```

**Full Testing:** See `TESTING.md`

## Documentation Files

### For Humans
- `README.md` - Project overview, features, setup
- `DEPLOYMENT.md` - Detailed deployment procedures (SSH, Netlify)
- `TESTING.md` - Testing strategy and checklists

### For AI (You!)
- `AI-README.md` - This file (quick reference)
- `.claude/CLAUDE.md` - Claude-specific instructions (if exists)

### Technical
- `VULNERABILITIES.md` - Known security issues
- `IMPLEMENTATION.md` - Implementation details
- `mcp/README.md` - MCP server documentation

## Troubleshooting

### "Can not get staking data from Metrics API"
- Check metrics API is running: `curl https://metrics.accumulatenetwork.io/v1/supply`
- Check frontend uses correct field names from API response
- Check CORS headers in browser console

### "Staked amount not showing"
- API returns `staked` field, frontend must use exact field name
- Check: `src/components/explorer/Staking.jsx`
- Check: `src/utils/getSupply.js`

### Build fails
```bash
npm install       # Update dependencies
npm run check     # Check TypeScript errors
```

### Deployment not working
- Beta: check GitHub remote (`git remote -v`), verify `git push github develop:main` landed, check the Netlify dashboard
- Production: it only changes when a build is rsynced to server1 — see DEPLOYMENT.md

## Key Insights for AI

1. **Production deploys are manual** — rsync a `VITE_NETWORK=any` build to server1; pushing GitHub deploys only beta
2. **GitHub `main` feeds the Netlify beta site** — GitLab (origin) is the primary repo and CI
3. **Netlify auto-deploys beta only** — production never auto-deploys
4. **Metrics API is separate** - Go service, deployed independently
5. **Field names matter** - API returns `staked`, frontend must use `staked` (not `stakedTokens`)

## Recent Changes

- ✅ Fixed staking display issue (`supply.stakedTokens` → `supply.staked`)
- ✅ Updated GitLab CI/CD to use Netlify deployment
- ✅ Database-backed caching for metrics service identity map
- ✅ Created this AI-README for better discoverability

## Questions to Ask

Before making changes:
1. "Is this a frontend issue (Explorer) or backend issue (metrics-service)?"
2. "What API endpoint does the frontend call?"
3. "What field names does the API return?"
4. "Where is this deployed? (Netlify vs dal-server1)"
5. "Which branch/remote should I push to?"

## Emergency Rollback

**Beta:**
- Netlify dashboard → "Publish deploy" on the last working version
- Or push a previous commit: `git push github <commit-hash>:main --force-with-lease`

**Production:**
- Restore a backup on server1: `ssh server1 'cd /var/www && tar -xzf /root/explorer-backup-<timestamp>.tar.gz'`
