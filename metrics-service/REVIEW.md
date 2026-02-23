# Metrics Service Code Review

**Date**: February 23, 2026
**Reviewer**: Claude

## Summary

The metrics service provides supply metrics and timestamp data for the Accumulate Explorer. Overall, the code is functional and well-structured, but there are several areas for improvement in terms of concurrency safety, error handling, resource management, and data accuracy.

## Critical Issues

### 1. **Race Conditions in Cache (HIGH PRIORITY)**

**Problem**: The global cache variables are accessed without synchronization:
```go
var (
    cachedMetrics *SupplyMetrics
    lastUpdate    time.Time
    cacheDuration = 5 * time.Minute
)
```

Multiple goroutines handling concurrent requests can read/write these variables simultaneously, causing race conditions.

**Impact**: Data corruption, incorrect cache hits, potential crashes

**Fix**: Use `sync.RWMutex` for thread-safe access:
```go
var (
    cacheMutex    sync.RWMutex
    cachedMetrics *SupplyMetrics
    lastUpdate    time.Time
)
```

### 2. **HTTP Client Resource Leaks**

**Problem**: Creating new `http.Post` and `http.Get` clients for each request without timeouts.

**Impact**:
- Connections can hang indefinitely
- Resource exhaustion under load
- No protection against slow/stalled network calls

**Fix**: Create a shared HTTP client with timeouts:
```go
var httpClient = &http.Client{
    Timeout: 10 * time.Second,
}
```

### 3. **Staked Amount is Estimated (MEDIUM PRIORITY)**

**Problem**: Line 237 uses `issued / 5` (~20% estimate) instead of querying actual staked amounts.

**Impact**: Inaccurate supply metrics displayed to users

**Fix**: Query actual staked amounts from staking contracts:
- `acc://staking.acme/validators` for validator stakes
- Aggregate total staked from all validators

## Moderate Issues

### 4. **No Rate Limiting**

**Problem**: No protection against abuse or excessive requests

**Impact**: Service can be overwhelmed, affecting availability

**Fix**: Implement rate limiting per IP:
```go
import "golang.org/x/time/rate"

var limiters = make(map[string]*rate.Limiter)
var limiterMutex sync.Mutex
```

### 5. **No Monitoring/Metrics**

**Problem**: No Prometheus metrics, request tracking, or error counters

**Impact**: Difficult to diagnose issues, monitor performance, or detect problems

**Fix**: Add Prometheus metrics:
- Request counts by endpoint
- Error rates
- Cache hit/miss ratios
- Response times
- LevelDB size

### 6. **LevelDB Not Gracefully Closed**

**Problem**: Line 123 uses `defer timestampDB.Close()`, but `log.Fatal` on line 135 calls `os.Exit` which doesn't run defers.

**Impact**: Database may not flush properly on crash

**Fix**: Use signal handling:
```go
sigChan := make(chan os.Signal, 1)
signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

go func() {
    <-sigChan
    log.Println("Shutting down...")
    timestampDB.Close()
    os.Exit(0)
}()
```

### 7. **Hard-coded ACME Precision**

**Problem**: Line 230 hard-codes `acmePrecision = 100000000`

**Impact**: Won't work if ACME precision changes or for other tokens

**Fix**: Use the precision from the API response:
```go
precision := accResp.Result.Account.Precision
divisor := int64(math.Pow10(precision))
issued := issuedRaw / divisor
```

### 8. **Integer Division Loses Precision**

**Problem**: Line 231 does integer division, losing fractional tokens

**Impact**: Supply metrics slightly inaccurate (loses ~0.67 ACME in current data)

**Fix**: Use float64 or return in smallest units and let client handle precision

## Minor Issues

### 9. **No Request Logging**

**Problem**: Only errors are logged, not successful requests

**Impact**: Difficult to audit usage, debug issues, or analyze traffic patterns

**Fix**: Add middleware for request logging with timing

### 10. **No Database Compaction**

**Problem**: LevelDB grows indefinitely without compaction

**Impact**: Disk space usage and performance degradation over time

**Fix**: Periodic compaction or TTL for old entries

### 11. **Error Messages Expose Internal Details**

**Problem**: Lines 170, 363, 377, etc. return generic errors to client

**Impact**: Makes debugging harder for legitimate users

**Fix**: Return more specific error codes (404, 503, etc.) with meaningful messages

### 12. **Major Block Calculation May Be Off**

**Problem**: Lines 269-272 assume perfect 12-hour intervals

**Impact**: Calculated major blocks may not match actual major blocks

**Fix**: Query receipts from v3 API to get actual major block numbers:
```go
// receipts contain MajorBlock field
```

### 13. **No Health Check Validation**

**Problem**: Line 139-144 always returns healthy, doesn't check:
- LevelDB accessibility
- Accumulate API reachability
- Cache state

**Impact**: Health check doesn't reflect actual service health

**Fix**: Add validation:
```go
// Check LevelDB
if _, err := timestampDB.Get([]byte("health"), nil); err != nil && err != leveldb.ErrNotFound {
    return unhealthy
}

// Check API reachability
resp, err := httpClient.Get(accumulateAPI)
```

### 14. **Timestamp Nanoseconds Conversion**

**Problem**: Line 495 converts timestamp with `* 1000000` (milliseconds to nanoseconds)

**Impact**: If API returns nanoseconds, this is wrong by factor of 1000

**Fix**: Verify API timestamp format and adjust accordingly

### 15. **No Structured Logging**

**Problem**: Using basic `log.Printf` without structured fields

**Impact**: Difficult to parse logs, query by fields, or integrate with log aggregators

**Fix**: Use structured logging (logrus, zap):
```go
log.WithFields(log.Fields{
    "txid": txid,
    "cache": "HIT",
}).Info("Serving timestamp")
```

## Optimizations

### 16. **Batch LevelDB Writes**

**Problem**: Line 503 writes to LevelDB on every request

**Impact**: Disk I/O on every cache miss

**Fix**: Batch writes or use write-ahead log

### 17. **Response Encoding Optimization**

**Problem**: Encoding response on every request even for cached data

**Impact**: CPU time spent encoding same data repeatedly

**Fix**: Pre-encode cached responses:
```go
cachedJSON []byte
```

### 18. **No Connection Pooling**

**Problem**: Each HTTP request creates new connection

**Impact**: Connection overhead, slower responses

**Fix**: Already handled by default HTTP client, but ensure MaxIdleConns is set

### 19. **Redundant JSON Marshaling**

**Problem**: Line 196 and 360 marshal the same request structure repeatedly

**Impact**: Wasted CPU cycles

**Fix**: Pre-marshal common requests

### 20. **Cache Duration Not Configurable**

**Problem**: Line 88 hard-codes 5 minutes

**Impact**: Can't tune for different deployment scenarios

**Fix**: Make configurable via environment variable

## Security Considerations

### 21. **No Input Validation on txid**

**Problem**: Line 310 accepts any txid without validation

**Impact**: Potential injection attacks, database pollution

**Fix**: Validate txid format (hex, length)

### 22. **No Request Size Limits**

**Problem**: No limits on request body size

**Impact**: Memory exhaustion attacks

**Fix**: Add middleware to limit request sizes

### 23. **No HTTPS for Outbound Requests**

**Problem**: Using HTTPS is good, but no certificate validation configuration

**Impact**: Potential MITM attacks

**Fix**: Configure TLS properly with cert pinning if needed

## Recommendations Priority

**Immediate (Deploy ASAP)**:
1. Fix race conditions with mutex
2. Add HTTP client timeouts
3. Fix LevelDB graceful shutdown

**Short Term (Next Sprint)**:
4. Implement actual staked amount queries
5. Add rate limiting
6. Fix hard-coded precision
7. Add request logging

**Medium Term (Next Month)**:
8. Add Prometheus metrics
9. Improve health checks
10. Add structured logging
11. Query actual major blocks from receipts

**Long Term (Ongoing)**:
12. Database compaction strategy
13. Configuration management
14. Performance optimizations

## Testing Gaps

- No unit tests
- No integration tests
- No load testing
- No error scenario testing
- No cache correctness testing

## Documentation Gaps

- API documentation (OpenAPI/Swagger)
- Deployment runbook
- Troubleshooting guide
- Performance tuning guide
- Monitoring setup guide
