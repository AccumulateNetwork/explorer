# Explorer - AI Quick Reference

> **For AI Assistants:** This document provides essential information about the Accumulate Explorer project in a format optimized for AI comprehension.

## Project Overview

**What:** Web-based blockchain explorer for Accumulate protocol
**Tech Stack:** React 17 + TypeScript 5 + Vite 5 + Ant Design 4
**Primary Repository:** GitLab (gitlab.com/accumulatenetwork/ecosystem/explorer)
**Mirror Repository:** GitHub (github.com/AccumulateNetwork/explorer)

## Deployment (MOST IMPORTANT)

### Live Sites

- **Production:** https://explorer.accumulatenetwork.io
- **Beta:** https://beta.explorer.accumulatenetwork.io
- **Hosting:** Netlify (auto-deploy from GitHub)

### How to Deploy

**Deploy to Beta:**
```bash
git push github develop:updates
```

**Deploy to Production:**
```bash
git push github develop:main
```

**That's it!** Netlify watches GitHub and auto-deploys.

### Why Two Repositories?

- **GitLab (origin):** Primary development, issue tracking, CI/CD
- **GitHub (github):** Netlify integration, auto-deployment

### Git Remotes

```bash
origin  git@gitlab.com:accumulatenetwork/ecosystem/explorer.git
github  git@github.com:AccumulateNetwork/explorer.git
```

## Development

### Quick Start

```bash
npm install       # Install dependencies
npm start         # Dev server (localhost:5173)
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
4. Deploy: `git push github develop:updates`

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
# Open http://localhost:5173
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
- Check GitHub remote: `git remote -v`
- Verify branch pushed: `git push github develop:updates`
- Check Netlify dashboard for build logs

## Key Insights for AI

1. **Deployment is via GitHub, not GitLab** - The GitLab CI/CD is optional
2. **Two branches matter:** `updates` (beta) and `main` (production)
3. **Netlify auto-deploys** - No manual build/upload needed
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
```bash
git push github main:updates  # Revert beta to production version
```

**Production:**
- Check Netlify dashboard for previous deployments
- Click "Publish deploy" on last working version
- Or push previous commit: `git push github <commit-hash>:main`
