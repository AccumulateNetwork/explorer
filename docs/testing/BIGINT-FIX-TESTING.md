# BigInt Transaction Display Fix - Testing Guide

## Summary

**Fixed**: `TypeError: Cannot mix BigInt and other types` in `SendTokens.tsx`

**Location**: `/src/components/message/SendTokens.tsx` lines 111, 116

**Issue**: When displaying transactions with multiple outputs, the reduce() function was incorrectly mixing BigInt and number types.

## The Fix

### Before (Broken):
```typescript
amount={outputs.reduce((v, x) => v + BigInt(x.amount || 0), 0n)}
```

**Problem**:
- `x.amount || 0` returns number `0` when falsy
- `x.amount` might already be a BigInt
- `BigInt(existingBigInt)` throws TypeError

### After (Fixed):
```typescript
amount={outputs.reduce((v, x) => {
  const amt = x.amount ?? 0;
  return v + (typeof amt === 'bigint' ? amt : BigInt(amt));
}, 0n)}
```

**Solution**:
- Uses nullish coalescing (`??`) to preserve `0n` BigInt
- Type-checks before conversion
- Only calls `BigInt()` on non-BigInt values

## Testing Strategy

### Test Objective

Verify that multi-output transactions (SendTokens with 2+ recipients) display correctly without TypeErrors.

### Test Requirements

1. **Local Devnet** - Running Accumulate blockchain
2. **Multi-Output Transaction** - Transaction with 2+ recipients (triggers reduce())
3. **Explorer** - Running in dev mode, connected to devnet
4. **Browser Console** - Monitor for TypeErrors

### Prerequisites

```bash
# 1. Devnet binary
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/devnet
ls -la ./devnet

# 2. Explorer dependencies
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/explorer
npm install
```

## Testing Steps

### Step 1: Start Devnet

```bash
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/devnet
./devnet start
```

**Expected Output**:
```
Devnet started successfully
Primary API: http://127.0.0.1:26660/v3
bvn0 API: http://127.0.0.1:26760/v3
...
```

**Verify**:
```bash
./devnet status
# Should show: Network: RUNNING
```

### Step 2: Create Test Transaction

You can create a multi-output transaction using one of these methods:

#### Option A: Manual Transaction (Recommended for Quick Testing)

If you have an existing multi-output transaction in your devnet, use that transaction hash directly.

#### Option B: API-Based Transaction

Use the Accumulate API to create a transaction programmatically:

```bash
# See the example in examples/quickstart_demo.go in the devnet repo
# This shows how to create lite accounts and send multi-output transactions
```

#### Option C: Wait for Natural Multi-Output Transaction

Some staking or batch transactions naturally have multiple outputs. Check the explorer for existing multi-output SendTokens transactions.

### Step 3: Start Explorer

```bash
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/explorer

# Configure to use local devnet
export REACT_APP_ACCUMULATE_API_URL=http://127.0.0.1:26660/v3

# Start development server
npm start
```

**Expected**:
- Opens browser at http://localhost:3000
- "Compiled successfully!" in terminal
- Explorer homepage loads

### Step 4: Test Transaction Display

1. **Navigate to transaction**:
   ```
   http://localhost:3000/tx/<TRANSACTION_HASH>
   ```

2. **Verify display** (all should pass):
   - ✅ Page loads without crashing
   - ✅ Transaction details display
   - ✅ "Amount" field shows total (sum of all outputs)
   - ✅ Individual recipient amounts display correctly
   - ✅ Formatted amount (2 decimals) displays

3. **Check browser console** (F12 → Console):
   - ✅ **NO** `TypeError: Cannot mix BigInt and other types`
   - ✅ **NO** JavaScript errors related to BigInt

### Step 5: Edge Case Testing

If possible, test these edge cases:

| Test Case | Scenario | Expected Result |
|-----------|----------|-----------------|
| **Zero amount** | Output with amount = 0 | Displays correctly, sum includes 0 |
| **Large amount** | Amount > Number.MAX_SAFE_INTEGER | BigInt arithmetic works, no precision loss |
| **Single output** | Only 1 recipient | Displays (doesn't trigger reduce(), no test of fix) |
| **Many outputs** | 5+ recipients | All amounts display, total is correct |

## Test Artifacts

### Created Files

1. **Documentation**:
   - `/docs/testing/bigint-transaction-test.md` - Detailed test plan
   - `/docs/testing/BIGINT-FIX-TESTING.md` - This file (testing guide)

2. **Test Scripts**:
   - `/scripts/test-bigint-fix.sh` - Bash test automation (partial)
   - `/scripts/test-bigint-tx.go` - Go test program (needs API updates)

3. **Fixed Code**:
   - `/src/components/message/SendTokens.tsx` - Lines 107-127

### Test Logs

When running automated tests, logs are saved to:
- `/tmp/bigint-test-*.log` - Test execution logs
- `/tmp/bigint-test-data.json` - Test transaction data

## Success Criteria

All of the following must be true:

- ✅ Multi-output transactions display without crashing
- ✅ No `Cannot mix BigInt` errors in console
- ✅ Total amount calculation is mathematically correct
- ✅ Individual output amounts display correctly
- ✅ Formatted amounts (2 decimal) render properly
- ✅ Zero amounts handled without errors
- ✅ Large amounts (BigInt) display without precision loss

## Known Limitations

### When the Fix Applies

The fix **only** applies when:
- Transaction is `SendTokens` or `IssueTokens`
- `outputs.length > 1` (line 107 condition)
- Amount field is being calculated

Single-output transactions **do not** trigger the reduce() code path, so they wouldn't have shown the bug originally.

### Browser Compatibility

The fix uses:
- **Nullish coalescing** (`??`) - Supported in all modern browsers
- **BigInt** - Supported in Chrome 67+, Firefox 68+, Safari 14+

Older browsers will fail regardless of the fix.

## Troubleshooting

### "Network: STOPPED" when checking devnet status

```bash
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/devnet
./devnet start
```

### Explorer shows "Cannot connect to network"

Check API URL:
```bash
export REACT_APP_ACCUMULATE_API_URL=http://127.0.0.1:26660/v3
npm start
```

### "Transaction not found" in explorer

- Wait longer for transaction to process (try 10-30 seconds)
- Verify transaction hash is correct
- Check devnet is still running

### Console still shows BigInt errors

1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Verify you're running the fixed version:
   ```bash
   cd /home/paul/go/src/gitlab.com/AccumulateNetwork/explorer
   git diff src/components/message/SendTokens.tsx
   ```
4. Restart npm dev server

## Cleanup

```bash
# Stop explorer (Ctrl+C in terminal)

# Stop devnet
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/devnet
./devnet stop

# Remove test logs (optional)
rm /tmp/bigint-test-*.log
rm /tmp/bigint-test-data.json
```

## Future Improvements

### Automated E2E Testing

Create a Playwright or Cypress test that:
1. Starts devnet programmatically
2. Creates multi-output transaction via API
3. Navigates explorer to transaction page
4. Asserts no console errors
5. Verifies amount calculations
6. Tears down devnet

### Unit Testing

Add Jest tests for the amount calculation logic:
```typescript
describe('SendTokens amount calculation', () => {
  it('should handle BigInt amounts', () => {
    const outputs = [
      { amount: 25_50000000n },
      { amount: 30_75000000n },
      { amount: 15_25000000n },
    ];
    const total = outputs.reduce((v, x) => {
      const amt = x.amount ?? 0;
      return v + (typeof amt === 'bigint' ? amt : BigInt(amt));
    }, 0n);
    expect(total).toBe(71_50000000n);
  });
});
```

## Related Documentation

- **Devnet Guide**: `/home/paul/go/src/gitlab.com/AccumulateNetwork/devnet/README.md`
- **Explorer README**: `/home/paul/go/src/gitlab.com/AccumulateNetwork/explorer/README.md`
- **Accumulate Protocol**: https://docs.accumulatenetwork.io

## Commit Message

When committing this fix:

```
fix: handle BigInt types correctly in multi-output transactions

Fixed TypeError when displaying SendTokens transactions with multiple
recipients. The reduce() function was mixing BigInt and number types.

Changed from:
  amount={outputs.reduce((v, x) => v + BigInt(x.amount || 0), 0n)}

To:
  amount={outputs.reduce((v, x) => {
    const amt = x.amount ?? 0;
    return v + (typeof amt === 'bigint' ? amt : BigInt(amt));
  }, 0n)}

This properly handles:
- undefined/null amounts (use 0, convert to BigInt)
- Already-BigInt amounts (use directly, no conversion)
- Number/string amounts (convert to BigInt)

Fixes #<issue-number>
```

## Contact

For questions or issues with this fix:
- Check browser console for specific error messages
- Verify devnet is running and accessible
- Ensure explorer is built with latest code changes
- Test with a known-good multi-output transaction first
