# Implementation Notes - Transaction Timestamps & Block Numbers

**Date**: February 22-23, 2026
**Developer**: Claude (with Paul)

## Overview

Added transaction timestamp and block number support to the Accumulate Metrics Service to provide the Explorer with accurate block data for transactions.

## Problem Statement

The Explorer was showing:
1. Empty timestamps for transactions
2. "N/A" for block numbers
3. No distinction between pending and delivered transactions

## Solution

Implemented `/v1/timestamp/{txid}` endpoint that:
- Returns timestamps from chain entries (for delivered transactions)
- Returns signature timestamps (for pending transactions)
- Calculates minor and absolute major block numbers
- Caches data permanently in LevelDB

## Key Implementation Details

### 1. Data Sources

**For Delivered Transactions:**
- Query: `GET https://mainnet.accumulatenetwork.io/timestamp/{txid}@unknown`
- Returns: Chain entries with block numbers and timestamps
- Source: Uses Accumulate's official TimestampService (v2 API)

**For Pending Transactions:**
- Query: `POST https://mainnet.accumulatenetwork.io/v3` with transaction scope
- Extract: Oldest signature timestamp from nested signature structures
- Recursive extraction handles delegated signatures

### 2. Block Number Calculation

#### Minor Blocks
Returned directly from the v2 timestamp endpoint chain entries.

#### Major Blocks (Absolute)
Calculated from timestamp using:
```go
// Constants (from staking docs)
genesisResetTime = time.Date(2025, 7, 14, 0, 0, 0, 0, time.UTC)
majorBlockInterval = 12 * time.Hour
preGenesisBlockOffset = 1864

// Calculation
postGenesisBlock = 1 + floor((timestamp - genesisResetTime) / 12hours)
absoluteBlock = preGenesisBlockOffset + postGenesisBlock
```

**Rationale:**
- Major blocks occur every 12 hours (cron: `"0 */12 * * *"`)
- Genesis reset on July 14, 2025 restarted block counter at 1
- Pre-genesis chain had 1,864 blocks
- Absolute numbering maintains continuity across reset

### 3. Caching Strategy

**LevelDB Database:**
- Location: `./data/timestamps.db`
- Key: Transaction hash (string)
- Value: TimestampData (JSON)

**Cache Logic:**
```go
type TimestampData struct {
    Chains          []ChainEntry `json:"chains"`
    Status          string       `json:"status,omitempty"`
    MinorBlock      int64        `json:"minorBlock,omitempty"`
    MajorBlock      int64        `json:"majorBlock,omitempty"`
    HasBlockTime    bool         `json:"_hasBlockTime,omitempty"`    // Internal
    SignatureTime   int64        `json:"_signatureTime,omitempty"`   // Internal
}
```

**Delivered Transactions (status: "delivered"):**
- Block data is permanent (won't change)
- Cache with `HasBlockTime: true`
- Return `X-Cache: HIT-BLOCK` on subsequent requests
- Never re-query the network

**Pending Transactions (status: "pending"):**
- Only have signature timestamps (no block yet)
- Cache with `HasBlockTime: false`
- Return `X-Cache: HIT-SIG` on cache hit
- Re-query on each request to check if delivered

### 4. Explorer Compatibility

**Issue Found:**
Explorer code expected `supply.circulatingTokens` field, but API was returning `supply.circulating`.

**Fix:**
Added both fields to SupplyMetrics:
```go
type SupplyMetrics struct {
    Max              int64 `json:"max"`
    Total            int64 `json:"total"`
    Circulating      int64 `json:"circulating"`
    CirculatingTokens int64 `json:"circulatingTokens"` // Alias
    Staked           int64 `json:"staked"`
}
```

**Files Modified:**
- `/home/paul/go/src/gitlab.com/AccumulateNetwork/explorer/src/components/message/timestamp.tsx`
  - Already had status handling
  - Fixed bug: `entries[0].block && entries[0].time` fails for block: 0
  - Changed to: `entries[0].time` only

## Documents Referenced

### Primary References

1. **Accumulate Timestamp Service**
   - Path: `/home/paul/go/src/gitlab.com/AccumulateNetwork/accumulate/cmd/accumulated-http/timestamp.go`
   - Purpose: Official implementation of timestamp queries
   - Key insight: Uses `QueryTransactionChains` with receipts
   - Line 53: `Q.QueryTransactionChains(ctx, id, &api.ChainQuery{IncludeReceipt: true})`

2. **Block Numbering Offset**
   - Path: `/home/paul/go/src/gitlab.com/AccumulateNetwork/staking/docs/blocks/block-numbering-offset.md`
   - Purpose: Documents genesis reset and absolute block calculation
   - Key data:
     - Genesis reset: July 14, 2025
     - Pre-genesis blocks: 1,864
     - Offset formula: `absoluteBlock = 1864 + postGenesisBlock`

### Supporting References

3. **Accumulate v3 API Types**
   - Path: `/home/paul/go/src/gitlab.com/AccumulateNetwork/accumulate/pkg/api/v3/types_gen.go`
   - Lines 361-367: Receipt structure with LocalBlock, LocalBlockTime, MajorBlock
   - Purpose: Understanding receipt data structure

4. **Explorer Timestamp Component**
   - Path: `/home/paul/go/src/gitlab.com/AccumulateNetwork/explorer/src/components/message/timestamp.tsx`
   - Line 34: Uses metrics service if available
   - Line 59: Extracts status from response
   - Line 142: Shows "Pending" for pending transactions

5. **Explorer Network Config**
   - Path: `/home/paul/go/src/gitlab.com/AccumulateNetwork/explorer/src/components/common/networks.tsx`
   - Line 19: `metrics: 'https://metrics.accumulatenetwork.io/v1'`

## Service Location

**Development:**
- `/home/paul/accumulate-metrics-service/`

**Production:**
- Server: `server1`
- Path: `/opt/accumulate-metrics/`
- Systemd: `accumulate-metrics.service`
- URL: `https://metrics.accumulatenetwork.io`
- Port: 8080 (internal), 443 (HTTPS via Nginx)

## Testing

### Test Cases

1. **Delivered Transaction**
   ```bash
   curl https://metrics.accumulatenetwork.io/v1/timestamp/a46534924b17040b9bbc6098e42be6629202181283e397e3fd770ff5be1e5ee6
   ```
   Expected:
   - status: "delivered"
   - minorBlock: 18745449
   - majorBlock: 2310 (absolute)
   - X-Cache: MISS (first), HIT-BLOCK (subsequent)

2. **Pending Transaction**
   ```bash
   curl https://metrics.accumulatenetwork.io/v1/timestamp/cc112612e975fa205698d8d24c272bfd2ab599f200268dd06d3814f1434a8e1b
   ```
   Expected:
   - status: "pending"
   - chains[0].block: 0
   - No minorBlock/majorBlock fields
   - Signature timestamp in chains[0].time

3. **Supply Metrics**
   ```bash
   curl https://metrics.accumulatenetwork.io/v1/supply
   ```
   Expected:
   - All fields present: max, total, circulating, circulatingTokens, staked
   - circulatingTokens === circulating

## Known Limitations

1. **Pre-Genesis Timestamps**
   - Transactions before July 14, 2025 return majorBlock: 0
   - Would need original genesis time (Oct 31, 2022) to calculate
   - Not implemented as pre-genesis blocks aren't accessible from current network

2. **Major Block Accuracy**
   - Calculated from timestamp, not from actual receipt
   - Receipts contain MajorBlock field, but v2 endpoint doesn't expose it
   - Calculation assumes perfect 12-hour schedule (close enough for practical use)

3. **Staked Amount**
   - Estimated at ~20% of total supply
   - TODO: Query actual staked amount from staking contracts

## Future Enhancements

1. Query receipts directly from v3 API to get exact major blocks
2. Implement pre-genesis block calculation
3. Query actual staked amounts
4. Add Prometheus metrics
5. Add rate limiting
6. Optional Redis cache layer for high-traffic scenarios

## Deployment Checklist

- [x] Update README.md with complete documentation
- [x] Test locally with both delivered and pending transactions
- [x] Verify cache behavior (HIT-BLOCK, MISS, UPDATE)
- [x] Verify major block calculation matches staking docs
- [x] Test Explorer integration
- [ ] Deploy to production server
- [ ] Verify production URLs work
- [ ] Monitor logs for errors
- [ ] Update Explorer config if using localhost for testing

## Commands for Deployment

```bash
# 1. Build and deploy
cd /home/paul/accumulate-metrics-service
./deploy.sh

# 2. Verify service is running
ssh server1 sudo systemctl status accumulate-metrics

# 3. Test endpoints
curl https://metrics.accumulatenetwork.io/health
curl https://metrics.accumulatenetwork.io/v1/supply
curl https://metrics.accumulatenetwork.io/v1/timestamp/a46534924b17040b9bbc6098e42be6629202181283e397e3fd770ff5be1e5ee6

# 4. Monitor logs
ssh server1 sudo journalctl -u accumulate-metrics -f

# 5. Clear cache if needed (will rebuild on queries)
ssh server1 "cd /opt/accumulate-metrics && rm -rf data/timestamps.db && sudo systemctl restart accumulate-metrics"
```

## Notes

- Service has CORS enabled for all origins
- Database persists across restarts
- Caching prevents unnecessary network queries
- Absolute major blocks maintain historical continuity
- Compatible with Explorer's existing timestamp display logic
