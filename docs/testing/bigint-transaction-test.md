# Testing BigInt Transaction Display Fix

## Problem Statement

The explorer was throwing a `TypeError: Cannot mix BigInt and other types` error when displaying transactions with multiple outputs in `SendTokens.tsx` (lines 111, 116).

## Root Cause

The code was using:
```typescript
amount={outputs.reduce((v, x) => v + BigInt(x.amount || 0), 0n)}
```

This failed because:
1. `x.amount || 0` could return `0` (number) when amount is falsy
2. `x.amount` could already be a BigInt
3. Calling `BigInt(alreadyBigInt)` throws a TypeError

## Fix Applied

Changed to:
```typescript
amount={outputs.reduce((v, x) => {
  const amt = x.amount ?? 0;
  return v + (typeof amt === 'bigint' ? amt : BigInt(amt));
}, 0n)}
```

This properly handles:
- `undefined/null` amounts → use 0, convert to BigInt
- Already-BigInt amounts → use directly
- Number/string amounts → convert to BigInt

## Test Plan

### Setup

1. **Start local devnet** - provides blockchain for testing
2. **Create test accounts** - sender and multiple recipients
3. **Execute multi-output transaction** - triggers the code path with BigInt arithmetic
4. **Run explorer locally** - verify transaction displays without errors
5. **Verify calculation** - check that total amount is correct

### Test Cases

| Test | Description | Expected Result |
|------|-------------|-----------------|
| TC1 | Single output transaction | Displays correctly (doesn't use the fixed code) |
| TC2 | Multiple outputs (2+) | Triggers reduce(), displays total amount |
| TC3 | Zero amount output | Handles 0n BigInt correctly |
| TC4 | Large amount (>Number.MAX_SAFE_INTEGER) | BigInt arithmetic works correctly |

## Test Execution

### Prerequisites

```bash
# 1. Devnet binary exists
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/devnet
ls -la ./devnet

# 2. Explorer is built
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/explorer
npm install
```

### Step 1: Start Devnet

```bash
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/devnet
./devnet start
```

**Expected output:**
```
Starting devnet...
Network started successfully
Directory: http://127.0.0.1:26660/v2
BVN0:      http://127.0.0.1:26760/v2
BVN1:      http://127.0.0.1:26860/v2
```

**Verify:**
```bash
./devnet status
curl http://127.0.0.1:26660/v2
```

### Step 2: Create Test Accounts

```bash
# Create sender account
./devnet wallet create sender.acme

# Create recipient accounts
./devnet wallet create recipient1.acme
./devnet wallet create recipient2.acme
./devnet wallet create recipient3.acme

# Fund sender account
./devnet faucet acc://sender.acme/ACME 10000000000  # 100 ACME
```

**Verification:**
```bash
./devnet wallet balance sender.acme
# Expected: 100.00000000 ACME
```

### Step 3: Create Multi-Output Transaction

This is the critical test - sending tokens to multiple recipients triggers the `reduce()` code path.

```bash
# Send to multiple recipients in one transaction
./devnet tx send \
  --from acc://sender.acme/ACME \
  --to acc://recipient1.acme/ACME:25.50 \
  --to acc://recipient2.acme/ACME:30.75 \
  --to acc://recipient3.acme/ACME:15.25

# Alternative: use accumulate CLI if devnet doesn't support --to multiple times
# This requires creating a JSON transaction
```

**Expected:**
- Transaction hash returned
- No errors
- Total sent: 71.50 ACME (25.50 + 30.75 + 15.25)

**Capture transaction hash for testing:**
```bash
# Save the transaction ID for later
export TEST_TX_ID="<transaction-hash-from-above>"
```

### Step 4: Start Explorer (Dev Mode)

```bash
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/explorer

# Configure to use local devnet
export REACT_APP_ACCUMULATE_API_URL=http://127.0.0.1:26660/v3

# Start development server
npm start
```

**Expected:**
- Explorer starts on http://localhost:3000
- No build errors
- Console shows "Compiled successfully!"

### Step 5: Test Transaction Display

1. **Navigate to transaction:**
   - Open http://localhost:3000/tx/${TEST_TX_ID}
   - Or search for the transaction hash in the explorer

2. **Verify display:**
   - ✅ Transaction loads without errors
   - ✅ No "Cannot mix BigInt" error in browser console
   - ✅ "Amount" field shows total: 71.50 ACME
   - ✅ Individual outputs show correct amounts
   - ✅ Formatted amount (with 2 decimals) displays correctly

3. **Check browser console:**
   ```
   F12 → Console
   Should be no TypeError messages
   ```

### Step 6: Edge Case Testing

#### Test Zero Amount
```bash
./devnet tx send \
  --from acc://sender.acme/ACME \
  --to acc://recipient1.acme/ACME:0 \
  --to acc://recipient2.acme/ACME:5.0
```

**Verify:** Transaction displays, total = 5.0 ACME

#### Test Large Amount (BigInt)
```bash
./devnet tx send \
  --from acc://sender.acme/ACME \
  --to acc://recipient1.acme/ACME:1000000.12345678 \
  --to acc://recipient2.acme/ACME:2000000.87654321
```

**Verify:** Transaction displays, total = 3000001.00000000 ACME (BigInt arithmetic correct)

## Cleanup

```bash
# Stop explorer (Ctrl+C)

# Stop devnet
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/devnet
./devnet stop
```

## Success Criteria

- ✅ Multi-output transactions display without errors
- ✅ Total amount calculation is correct
- ✅ No "Cannot mix BigInt" errors in console
- ✅ Both formatted and raw amounts display correctly
- ✅ Zero amounts handled correctly
- ✅ Large amounts (>Number.MAX_SAFE_INTEGER) work correctly

## Automated Test Script

See: `scripts/test-bigint-fix.sh` (to be created)

## Related Files

- **Fixed file:** `src/components/message/SendTokens.tsx`
- **Test script:** `scripts/test-bigint-fix.sh` (to be created)
- **Devnet repo:** `/home/paul/go/src/gitlab.com/AccumulateNetwork/devnet`

## Notes

- The bug only appears when `outputs.length > 1` (line 107 condition)
- Single-output transactions don't trigger the reduce() code path
- The fix uses nullish coalescing (`??`) instead of logical OR (`||`)
- Type checking prevents calling `BigInt()` on already-BigInt values
