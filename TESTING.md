# Explorer Testing Strategy

**Last Updated:** 2025-10-24
**Version:** Post-merge (develop + updates integration)

## Overview

This document outlines the testing strategy for the Accumulate Explorer after merging the `updates` branch into `develop`. The merge introduced significant new features that require comprehensive testing before production deployment.

## Changes Requiring Testing

### From Updates Branch
- ✅ WalletConnect integration
- ✅ Switch from web3-react to ethers.js library
- ✅ EIP-712 signing support
- ✅ Mainnet Beta network configuration
- ✅ Kermit ETH endpoint support
- ✅ Enhanced signature inspection UI
- ✅ Validator signature display for anchors

### From Develop Branch
- ✅ MCP server implementation
- ✅ Network health checks with CORS validation
- ✅ SDK patches for unknown executor versions
- ✅ Health check error handling improvements

### Merge Resolutions
- Local devnet configuration (port 16591 + ETH support)
- SDK patches retained, Web3 import removed
- Dependency tree fully regenerated

## Testing Phases

### Phase 1: Local Testing (5-10 minutes)

**Purpose:** Quick smoke test to catch obvious issues before deployment.

**Setup:**
```bash
npm start
# Opens: http://localhost:5173
```

**Tests:**
1. Page loads without console errors
2. All networks appear in dropdown
3. Can switch between networks
4. No ExecutorVersion errors
5. Basic UI rendering works

**Success Criteria:**
- No red console errors
- All networks listed
- Page interactive and responsive

---

### Phase 2: Beta Deployment (Recommended Staging)

**Environment:** beta.explorer.accumulatenetwork.io

**Build Process:**
```bash
# Clean build
npm run build

# Deploy build/ directory to beta server
# Location: /var/www/beta-explorer/ (or appropriate path)
```

**Why Beta?**
- Safe staging environment (no impact on production users)
- Tests against real networks
- Validates browser-specific issues (CORS, etc.)
- Team can review before production

---

### Phase 3: Beta Testing Checklist

#### 3.1 Basic Functionality

**URL:** https://beta.explorer.accumulatenetwork.io

- [ ] Page loads without errors
- [ ] No console errors on initial load (F12)
- [ ] All UI elements render correctly
- [ ] Search functionality works
- [ ] Navigation works (blocks, transactions, accounts)

**How to Test:**
1. Open beta URL in browser
2. Press F12 to open Developer Tools → Console
3. Check for any red error messages
4. Click through main navigation items

---

#### 3.2 Network Switching & Health Indicators

**Critical Test:** Network dropdown and health status

- [ ] **Mainnet** - Shows green dot, loads correctly
- [ ] **Mainnet (Beta)** - NEW - Shows status, connects to beta.mainnet.accumulatenetwork.io
- [ ] **Kermit Testnet** - Shows green dot, no ExecutorVersion errors
- [ ] **Fozzie Testnet** - Shows status, loads correctly
- [ ] **Local Devnet** - Available in dropdown (if applicable)

**How to Test:**
1. Click network dropdown in top-right
2. Verify each network shows a status indicator (green/yellow/gray dot)
3. Select each network one by one
4. Verify page reloads and shows correct network name
5. Check console for errors after each switch

**Expected Results:**
- Healthy networks show 🟢 green dot
- Unhealthy networks show 🟡 yellow/orange dot
- Loading networks show ⚪ gray dot
- No "Unknown ExecutorVersion" errors in console

**Kermit Specific Test:**
- Console should show: `[SDK Patches] ExecutorVersion patches applied`
- Should NOT show: `Error: Unknown ExecutorVersion 'v2-jiuquan'`
- Network version displays (may show "Jiuquan" or "Unknown")

---

#### 3.3 Web3 Wallet Integration (NEW)

**Critical Test:** WalletConnect and MetaMask connectivity

**Prerequisites:**
- MetaMask browser extension installed (for MetaMask test)
- WalletConnect-compatible wallet on mobile (for WalletConnect test)

**Tests:**

- [ ] **Connect Button Visible**
  - Look for "Connect Wallet" or Web3 button in UI
  - Button should be clickable and responsive

- [ ] **MetaMask Connection**
  1. Click connect wallet button
  2. Select MetaMask option
  3. Approve connection in MetaMask popup
  4. Verify connected status displays
  5. Check account address shows correctly

- [ ] **WalletConnect Connection**
  1. Click connect wallet button
  2. Select WalletConnect option
  3. Scan QR code with mobile wallet
  4. Approve connection
  5. Verify connected status
  6. Check account address displays

- [ ] **Message Signing**
  1. Connect wallet
  2. Find sign message feature (if available)
  3. Initiate signature request
  4. Sign in wallet
  5. Verify signature displays/validates

- [ ] **Disconnect**
  1. Click disconnect option
  2. Verify wallet disconnects
  3. Check UI returns to "Connect Wallet" state

**Expected Results:**
- Modal appears with wallet options
- Connection flow completes without errors
- Account address displays correctly
- Disconnect works cleanly

**Troubleshooting:**
- If WalletConnect fails: Check browser console for errors
- If MetaMask fails: Ensure extension is unlocked
- Check network selection in wallet matches explorer network

---

#### 3.4 Executor Version Handling

**Critical Test:** Verify SDK patches work correctly

**Test on Kermit Network:**
1. Switch to Kermit Testnet
2. Open browser console (F12)
3. Look for log messages

**Expected Console Output:**
```
[SDK Patches] ExecutorVersion patches applied
Unknown ExecutorVersion 'v2-jiuquan', treating as unknown
```

**Should NOT See:**
```
Error: Unknown ExecutorVersion 'v2-jiuquan'
  at async Version.tsx:15
```

**UI Check:**
- Network version should display in header/footer
- May show "Jiuquan" or "Unknown" - both are acceptable
- Should NOT crash or show error page

---

#### 3.5 Network Health Checks (CORS Validation)

**Critical Test:** Verify CORS fix for Kermit

**Background:** Kermit had duplicate CORS headers on POST requests that broke browser access. The MCP health check should now detect this correctly.

**Test:**
1. Open any network in explorer
2. Click network dropdown
3. Observe status indicators for all networks

**Expected Results:**
- Mainnet: 🟢 Green (healthy)
- Mainnet Beta: 🟢 or 🟡 (depends on actual status)
- Kermit: 🟢 Green (CORS fixed, should be healthy)
- Fozzie: 🟢 or 🟡 (depends on actual status)

**If Kermit Shows Yellow/Orange:**
- Check browser console for CORS errors
- This may indicate CORS issue has returned
- Investigate with: `curl -v -X POST https://kermit.accumulatenetwork.io/v3 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"network-status","params":{}}'`
- Look for duplicate `Access-Control-Allow-Origin` headers

---

#### 3.6 ETH Endpoints (NEW)

**Test Kermit ETH Support:**

**If ETH features are visible in UI:**
- [ ] ETH-related queries work
- [ ] ETH balance displays correctly
- [ ] ETH transactions show up

**If no visible ETH features:**
- [ ] Note that ETH endpoint is configured but may not be actively used
- [ ] Check console for any ETH-related errors

**Configuration Check:**
- Kermit: `https://kermit.accumulatenetwork.io/eth`
- Local: `http://127.0.0.1:16591/eth`

---

#### 3.7 Signature Inspection UI (NEW)

**Critical Test:** Enhanced signature display

**Find a Transaction with Signatures:**
1. Navigate to any recent transaction
2. Look for signature section
3. Should see "Inspect" or similar button

**Tests:**
- [ ] Inspect button appears on transactions with signatures
- [ ] Clicking inspect shows signature details
- [ ] Signature details include:
  - Public key
  - Signature type
  - Timestamp (if available)
  - Validator info (for anchor signatures)

**For Anchor Transactions:**
- [ ] Validator signatures display
- [ ] Shows which validators signed
- [ ] Validator identifiers are readable

---

#### 3.8 Mainnet Beta Network (NEW)

**Critical Test:** New network configuration

**Configuration:**
- Label: "Mainnet (Beta)"
- API: `https://beta.mainnet.accumulatenetwork.io`
- Metrics: `https://metrics.accumulatenetwork.io/v1`

**Tests:**
- [ ] Appears in network dropdown
- [ ] Can select and switch to Mainnet Beta
- [ ] Shows health status indicator
- [ ] Connects successfully
- [ ] Can browse accounts
- [ ] Can view transactions
- [ ] Can search

**Comparison with Mainnet:**
- [ ] Mainnet and Mainnet Beta show different data
- [ ] Beta may have newer features or test data
- [ ] Both should be accessible simultaneously (open two tabs)

---

#### 3.9 Bundle Size & Performance

**Tests:**
- [ ] Page loads in < 5 seconds (on reasonable connection)
- [ ] Network switching is responsive (< 1 second)
- [ ] No lag when browsing accounts/transactions
- [ ] Browser console shows no performance warnings

**Check Bundle Size:**
```bash
# After build
ls -lh build/assets/*.js | sort -k5 -h

# Expected large bundles:
# - vendor-walletconnect: ~2.7 MB (589 KB gzipped)
# - vendor-antd: ~2 MB (428 KB gzipped)
# - vendor-sdk: ~1.3 MB (267 KB gzipped)
```

**Performance Indicators:**
- Initial page load
- Network switch speed
- Search response time
- Transaction list loading

---

### Phase 4: MCP Server Testing (Optional)

**If using Claude Desktop or MCP integration:**

**Setup:**
```bash
cd mcp
npm run build

# Configure in Claude Desktop config:
# ~/Library/Application Support/Claude/claude_desktop_config.json
```

**MCP Tools to Test:**
- [ ] `check_network_health` against beta networks
- [ ] `query_account` on beta
- [ ] `query_transaction` works
- [ ] `network_status` returns correct data
- [ ] `set_network` can switch to beta URL

**Beta Environment Testing:**
```javascript
// Test MCP against beta
set_network({ network: "https://beta.mainnet.accumulatenetwork.io" });
check_network_health();
```

---

### Phase 5: Production Deployment

**Only after beta testing succeeds.**

**Deployment Targets:**
1. **explorer.accumulatenetwork.io** - Main Mainnet Explorer
2. **kermit.explorer.accumulatenetwork.io** - Kermit Testnet Explorer
3. **fozzie.explorer.accumulatenetwork.io** - Fozzie Testnet Explorer
4. **beta.explorer.accumulatenetwork.io** - Keep updated as staging

**Production Deployment Checklist:**
- [ ] All beta tests passed
- [ ] No critical console errors
- [ ] Team review completed
- [ ] Backup current production build
- [ ] Deploy to production servers
- [ ] Verify each domain individually
- [ ] Monitor for errors in first hour
- [ ] Rollback plan ready if needed

---

## Known Issues to Watch For

### Dependency Warnings (Non-Critical)
- 39 npm vulnerabilities detected
- Some WalletConnect packages deprecated (migrating to Reown AppKit)
- Run `npm audit` for details

### Potential Issues

1. **Browser Cache**
   - Users may need hard refresh (Ctrl+Shift+R)
   - Old JavaScript may be cached
   - Solution: Clear cache or use incognito mode for testing

2. **Wallet Extensions**
   - MetaMask may need to be unlocked
   - WalletConnect QR code may timeout
   - Solution: Refresh and retry

3. **Network Switching**
   - May take 1-2 seconds to load
   - Gray dot = still loading
   - Solution: Wait for status indicator

4. **CORS Issues**
   - If Kermit shows as unhealthy, check CORS headers
   - Solution: Verify nginx configuration on server

---

## Testing Tools

### Browser Developer Tools
```
Chrome/Edge: F12 or Ctrl+Shift+I
Firefox: F12 or Ctrl+Shift+K
Safari: Cmd+Option+I (enable Developer menu first)
```

### Console Commands for Testing
```javascript
// Check for SDK patches
// Should see: [SDK Patches] ExecutorVersion patches applied

// Check network status (in browser console)
console.log(window.location.href);
```

### Curl Tests for CORS
```bash
# Test Kermit CORS (should show single header)
curl -v -X POST https://kermit.accumulatenetwork.io/v3 \
  -H "Origin: https://kermit.explorer.accumulatenetwork.io" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"network-status","params":{}}' \
  2>&1 | grep -i "access-control-allow-origin"

# Expected: Single line
# Bad: Multiple lines (duplicate headers)
```

---

## Success Criteria

### Beta Testing Success
- ✅ All networks accessible
- ✅ No console errors
- ✅ WalletConnect/MetaMask work
- ✅ Health indicators accurate
- ✅ Kermit shows as healthy
- ✅ No ExecutorVersion errors
- ✅ Page loads in reasonable time
- ✅ Team approval

### Production Deployment Success
- ✅ All beta criteria met
- ✅ Deployed to all domains
- ✅ Each domain tested individually
- ✅ No user-reported errors in first 24 hours
- ✅ Monitoring shows normal traffic patterns

---

## Rollback Plan

**If critical issues discovered in production:**

```bash
# On server
cd /var/www/explorer
mv build build-broken
mv build-backup build
# Restart web server if needed
```

**Triggers for Rollback:**
- Console errors preventing core functionality
- CORS errors blocking network access
- WalletConnect completely broken
- Health checks all showing red
- Executor version crashes on Kermit

---

## Testing Contact

**Questions or Issues:**
- Check existing documentation in `mcp/` directory
- Review merge commit: `0121b34`
- Consult `mcp/IMPLEMENTATION.md` for technical details

**Related Documents:**
- `mcp/README.md` - MCP usage guide
- `mcp/IMPLEMENTATION.md` - Technical implementation details
- `mcp/EXPLORER_HEALTH_CHECK.md` - CORS investigation
- `TESTING.md` - This document

---

## Version History

**2025-10-24 - Initial Version**
- Created after merging updates branch into develop
- Covers WalletConnect, Mainnet Beta, ETH support
- Includes CORS validation and executor version testing

**Merge Details:**
- Commit: `0121b34`
- Merged: `origin/updates` → `develop`
- Conflicts: 3 (manually resolved)
- Build: Successful
- Status: Ready for beta testing
