# Explorer Deployment Guide

**Last Updated:** 2025-10-24
**Version:** Network switching fixes and UI color improvements

## Build Information

**Current Build:**
- Commit: fe435dd
- Branch: develop
- Build Size: 39MB
- Built: 2025-10-24 20:34 UTC
- Status: ✅ Ready for deployment

**Changes in This Build:**
- ✅ Buffer polyfill for browser compatibility
- ✅ Network switching now reloads page
- ✅ **FIXED: Network switching persistence on localhost**
- ✅ **FIXED: Removed non-existent Mainnet Beta network**
- ✅ **NEW: Maroon top bar for local devnet (#4B0000)**
- ✅ **NEW: Darker purple for testnets (#2D1640)**
- ✅ WalletConnect integration
- ✅ ETH endpoint support
- ✅ SDK patches for executor versions
- ✅ MCP server implementation

---

## Quick Deployment to Beta

### Option 1: SSH/SCP Deployment

```bash
# From explorer directory
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/explorer

# Copy build to beta server (adjust path as needed)
scp -r build/* user@beta-server:/var/www/beta-explorer/

# Or use rsync for incremental updates
rsync -avz --delete build/ user@beta-server:/var/www/beta-explorer/
```

### Option 2: Git Pull on Server

```bash
# On beta server
cd /path/to/explorer
git pull origin develop
npm install
npm run build
# Copy build/ to web root
cp -r build/* /var/www/beta-explorer/
```

### Option 3: Manual Copy

```bash
# 1. Archive the build
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/explorer
tar -czf explorer-beta-build.tar.gz build/

# 2. Transfer to beta server
# (use your preferred method: scp, sftp, etc.)

# 3. On beta server, extract
tar -xzf explorer-beta-build.tar.gz
cp -r build/* /var/www/beta-explorer/
```

---

## Server Configuration

### Beta Server Details

**Domain:** beta.explorer.accumulatenetwork.io

**Expected Web Root:**
- `/var/www/beta-explorer/` (typical)
- OR `/var/www/html/beta-explorer/`
- OR custom path configured in nginx/apache

**Files to Deploy:**
```
build/
├── assets/           # JavaScript and CSS bundles
├── index.html        # Main HTML file
├── favicon-*.png     # Favicons
├── manifest.json     # PWA manifest
├── meta.gif          # OG image
├── meta.png          # OG image
├── _redirects        # Netlify redirects (if applicable)
└── robots.txt        # SEO robots file
```

---

## Deployment Steps

### Step 1: Backup Current Beta

**On beta server:**
```bash
cd /var/www/
mv beta-explorer beta-explorer-backup-$(date +%Y%m%d-%H%M%S)
mkdir beta-explorer
```

### Step 2: Deploy New Build

**From local machine:**
```bash
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/explorer

# Option A: Direct copy via SCP
scp -r build/* user@beta-server:/var/www/beta-explorer/

# Option B: rsync (recommended for updates)
rsync -avz --delete build/ user@beta-server:/var/www/beta-explorer/
```

### Step 3: Set Permissions

**On beta server:**
```bash
cd /var/www/beta-explorer
chown -R www-data:www-data .
chmod -R 755 .
```

### Step 4: Verify Deployment

**Test URLs:**
```bash
# Check if files are accessible
curl -I https://beta.explorer.accumulatenetwork.io/
curl -I https://beta.explorer.accumulatenetwork.io/index.html
curl -I https://beta.explorer.accumulatenetwork.io/assets/index-*.js
```

**Expected Response:**
```
HTTP/2 200
content-type: text/html
```

### Step 5: Browser Verification

1. Open: https://beta.explorer.accumulatenetwork.io
2. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. Open Console (F12)
4. Verify:
   - [ ] Page loads without errors
   - [ ] Console shows: `[SDK Patches] ExecutorVersion patches applied`
   - [ ] No Buffer undefined errors
   - [ ] Networks appear in dropdown
   - [ ] Network switching reloads page

---

## Nginx Configuration

**If using nginx, ensure config includes:**

```nginx
server {
    listen 443 ssl http2;
    server_name beta.explorer.accumulatenetwork.io;

    root /var/www/beta-explorer;
    index index.html;

    # SSL certificates
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Serve index.html for all routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # CORS headers (if needed)
    add_header Access-Control-Allow-Origin *;
}
```

**Reload nginx after changes:**
```bash
nginx -t                    # Test config
systemctl reload nginx      # Reload if test passes
```

---

## Post-Deployment Testing

### Critical Tests

Follow the testing checklist in `TESTING.md` Phase 3 (Beta Testing).

**Quick verification:**

1. **Page Loads**
   ```
   https://beta.explorer.accumulatenetwork.io
   ```
   - [ ] No console errors
   - [ ] SDK patches message appears
   - [ ] UI renders correctly

2. **Network Switching**
   - [ ] Click network dropdown
   - [ ] Select different network
   - [ ] Page reloads (NEW behavior)
   - [ ] Shows correct network data

3. **Kermit Test**
   - [ ] Switch to Kermit
   - [ ] No ExecutorVersion crash
   - [ ] Console shows "treating as unknown" warning (OK)

4. **WalletConnect**
   - [ ] Connect wallet button appears
   - [ ] Modal opens
   - [ ] Can connect with MetaMask or WalletConnect

5. **Mainnet Beta** (NEW)
   - [ ] Appears in dropdown
   - [ ] Can select and use
   - [ ] Shows different data from mainnet

---

## Rollback Procedure

**If deployment fails:**

```bash
# On beta server
cd /var/www/
rm -rf beta-explorer
mv beta-explorer-backup-YYYYMMDD-HHMMSS beta-explorer
systemctl reload nginx
```

**Verify rollback:**
```bash
curl -I https://beta.explorer.accumulatenetwork.io/
```

---

## Troubleshooting

### Issue: 404 on routes

**Cause:** Nginx not configured for SPA routing

**Fix:** Add `try_files $uri $uri/ /index.html;` to nginx config

### Issue: Assets not loading

**Cause:** Wrong permissions or path

**Fix:**
```bash
chown -R www-data:www-data /var/www/beta-explorer
chmod -R 755 /var/www/beta-explorer
```

### Issue: Old version cached

**Cause:** Browser cache

**Fix:** Hard refresh (Ctrl+Shift+R) or clear cache

### Issue: Network switching doesn't work

**Cause:** Old JavaScript cached

**Fix:**
1. Clear browser cache completely
2. Try incognito window
3. Check console for errors

### Issue: Buffer undefined errors

**Cause:** Build didn't include polyfills

**Fix:** Rebuild with latest code:
```bash
npm install
npm run build
```

---

## Build Artifacts

**Location:** `/home/paul/go/src/gitlab.com/AccumulateNetwork/explorer/build/`

**Key Files:**
- `index.html` - Entry point (2.5 KB)
- `assets/index-*.js` - Main JavaScript (~1.2 MB)
- `assets/vendor-sdk-*.js` - Accumulate SDK (~1.5 MB)
- `assets/vendor-walletconnect-*.js` - WalletConnect (~2.7 MB)
- `assets/vendor-antd-*.js` - Ant Design UI (~2 MB)
- `assets/vendor-web3-*.js` - Web3 libraries (~1.1 MB)

**Total Size:** 39 MB uncompressed, ~2.5 MB gzipped

---

## Environment Variables

**Build-time variables (from vite):**
```bash
VITE_NETWORK=any          # Allow network switching
```

**No runtime environment variables needed** - all configuration is bundled.

---

## Monitoring

**After deployment, monitor:**

1. **Server Logs**
   ```bash
   tail -f /var/log/nginx/access.log
   tail -f /var/log/nginx/error.log
   ```

2. **Browser Console**
   - Check for JavaScript errors
   - Monitor API requests
   - Watch for CORS issues

3. **Performance**
   - Page load time
   - Bundle download speed
   - API response times

---

## Production Deployment

**After beta testing succeeds**, deploy to production:

**Domains:**
- explorer.accumulatenetwork.io (mainnet)
- kermit.explorer.accumulatenetwork.io
- fozzie.explorer.accumulatenetwork.io

**Process:**
1. Same as beta deployment
2. Update all domains
3. Test each individually
4. Monitor for 24 hours

---

## Changelog

**2025-10-24 - c5efd52**
- Added Buffer polyfill for browser compatibility
- Fixed network switching to reload page
- Added WalletConnect support
- Added Mainnet Beta network
- Added ETH endpoint support
- SDK patches for executor versions

**2025-10-24 - 0121b34**
- Merged updates branch (WalletConnect, ethers.js)
- Merged develop branch (MCP, health checks)

**2025-10-24 - 33655b3**
- Added MCP server implementation
- Network health checks with CORS validation

---

## Support

**Documentation:**
- TESTING.md - Testing procedures
- TEST-RESULTS.md - Test results
- mcp/README.md - MCP documentation

**Repository:**
- Branch: develop
- GitLab: gitlab.com/accumulatenetwork/ecosystem/explorer

**Build Info:**
```bash
git log --oneline -5
c5efd52 fix: Add Buffer polyfill and network switching reload
0bf1aea docs: Add comprehensive testing strategy
0121b34 Merge branch 'updates' into develop
33655b3 feat: Add MCP server for Explorer
```
