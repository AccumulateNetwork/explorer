# EXACT Explorer Health Check Process

## Source Code
`/src/components/common/Network.tsx` lines 103-206

## MCP Implementation
The MCP health check (`mcp/src/index.ts`) replicates this process PLUS adds CORS validation since browsers enforce CORS but Node.js/curl do not.

## Step-by-Step Process

### 0. CORS Validation (MCP Addition)
Before checking network health, validate CORS headers via POST request:
- Makes actual POST request to `{apiUrl}/v3` (matching what browsers do)
- Checks `Access-Control-Allow-Origin` header
- Detects duplicate headers (e.g., `*, *`) which browsers reject
- Reports as unhealthy if CORS is misconfigured

**Why POST not OPTIONS:** The Kermit API has correct CORS on OPTIONS responses but duplicate headers on POST responses. Browsers use POST for API calls, so we must test POST.

**Example Failure:**
```
Kermit: Access-Control-Allow-Origin: *, *
Result: 🔴 UNHEALTHY - "Duplicate CORS headers detected: *, * (browsers only accept one value)"
```

### 1. Get Network Status
```typescript
const { network } = await ctx.api.networkStatus({});
const p = network.partitions;
```
- Calls API `networkStatus()` method
- Extracts `network.partitions` array

### 2. Query Ledgers for Each Partition
```typescript
const get = async (p: PartitionInfo, path: string, c: Ctor<Account>) => {
  const u = p.type === PartitionType.Directory
    ? DN  // URL.parse('dn.acme')
    : URL.parse(`bvn-${p.id}.acme`);

  const r = await ctx.api.query(u.join(path));

  // Type check
  if (!isRecordOf(r, c)) {
    throw new Error(`${u}/${path} is not a ${c.name}`);
  }

  // Freshness check
  const ageSeconds = (Date.now() - (r.lastBlockTime?.getTime() || 0)) / 1000;
  if (ageSeconds > 60) {
    throw new Error(`Response is too old: ${r.lastBlockTime}`);
  }

  return { url: u, part: p, ledger: r.account };
};
```

**KEY DETAILS:**
- Uses `URL.parse()` from accumulate.js to create URL objects
- Uses `u.join(path)` to append path to URL
- Queries: `acc://dn.acme/anchors`, `acc://dn.acme/synthetic`, `acc://bvn-{id}.acme/anchors`, etc.
- Checks partition type using `PartitionType.Directory` enum (not string comparison!)
- Validates response is correct type (AnchorLedger or SyntheticLedger)
- Validates lastBlockTime is < 60 seconds old
- Returns the `r.account` as `ledger`

### 3. Query Both Anchor and Synthetic Ledgers
```typescript
const [anchors, synth] = await Promise.all([
  Promise.all(p.map((x) => get(x, 'anchors', AnchorLedger))),
  Promise.all(p.map((x) => get(x, 'synthetic', SyntheticLedger))),
]);
```
- Queries ALL partitions in parallel
- Gets both anchor AND synthetic ledgers for each

### 4. Check Anchor Synchronization
```typescript
function anchorsOk(ledgers: LedgerInfo<AnchorLedger>[]) {
  for (const a of ledgers) {
    for (const b of ledgers) {
      // Only check if at least one is a Directory
      if (
        a.part.type !== PartitionType.Directory &&
        b.part.type !== PartitionType.Directory
      ) {
        continue;
      }

      // Find entry in b's sequence for partition a
      const ba = b.ledger.sequence?.find((x) => x.url.equals(a.url));

      if (
        !ba ||
        a.ledger.minorBlockSequenceNumber - ba.delivered > okThreshold
      ) {
        return false;
      }
    }
  }
  return true;
}
```

**KEY DETAILS:**
- Compares EVERY pair of partitions
- Uses `x.url.equals(a.url)` - URL object equality, NOT string comparison!
- Checks if partition 'a' is more than 10 blocks ahead of what 'b' has received
- Only checks pairs where at least one is Directory

### 5. Check Synthetic Message Synchronization
```typescript
function syntheticOk(ledgers: LedgerInfo<SyntheticLedger>[]) {
  for (const a of ledgers) {
    for (const b of ledgers) {
      const ab = a.ledger.sequence?.find((x) => x.url.equals(b.url));
      const ba = b.ledger.sequence?.find((x) => x.url.equals(a.url));

      if (!ab && !ba) continue;
      if (!ab || !ba) return false;

      if (ab.produced - ba.delivered > okThreshold) {
        return false;
      }
    }
  }
  return true;
}
```

**KEY DETAILS:**
- Checks BIDIRECTIONAL message flow between ALL partition pairs
- Uses `x.url.equals(b.url)` - URL object equality
- If neither partition knows about the other, skip
- If only ONE knows about the other (asymmetric), return FALSE
- Checks if messages produced by 'a' to 'b' exceed delivered by more than 10

### 6. Final Result
```typescript
return anchorsOk(anchors) && syntheticOk(synth);
```
- Returns true ONLY if BOTH anchor and synthetic checks pass
- Any exception caught returns undefined (shows gray dot)

## Critical Differences from My Implementation

1. **URL Objects vs Strings**: Explorer uses `URL.parse()` and `url.equals()`, NOT string comparison
2. **Query Format**: Uses `u.join(path)` which creates `acc://dn.acme/anchors` style URLs
3. **Type Checking**: Uses `PartitionType.Directory` enum, not `p.type === "directory"` string
4. **Response Validation**: Checks if response is correct type (AnchorLedger/SyntheticLedger)
5. **URL Comparison**: Uses `x.url.equals(a.url)`, NOT `toLowerCase().includes()`

## My Bugs

1. Using string URLs like `"dn.acme/anchors"` instead of proper URL objects
2. Using `toLowerCase().includes()` for URL matching instead of `.equals()`
3. Checking partition type as number/string instead of PartitionType enum
4. Not validating response types
