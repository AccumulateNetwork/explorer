# Accumulate Metrics Service

HTTP service providing ACME token supply metrics and transaction timestamp data for the Accumulate Explorer.

## Features

- **Supply Metrics**: Real-time ACME token supply data from Accumulate mainnet
- **Transaction Timestamps**: Block timestamps with persistent caching
- **Block Information**: Minor and absolute major block numbers
- **Transaction Status**: Pending vs delivered status
- **LevelDB Caching**: Permanent caching for delivered transactions

## Endpoints

### GET /v1/supply

Returns ACME token supply metrics queried from the Accumulate mainnet.

**Response:**
```json
{
  "max": 50000000000000000,
  "total": 32567998467211002,
  "circulating": 26054398773768802,
  "circulatingTokens": 26054398773768802,
  "staked": 6513599693442200
}
```

**Fields:**
- `max`: Maximum supply limit (500M ACME)
- `total`: Total issued tokens
- `circulating`: Circulating supply (total - staked)
- `circulatingTokens`: Alias for `circulating` (Explorer compatibility)
- `staked`: Estimated staked tokens (~20% of total)

All values are in atomic units (ACME × 10⁸).

**Cache:** 5 minutes

### GET /v1/timestamp/{txid}

Returns timestamp and block information for a transaction.

**Parameters:**
- `txid`: Transaction hash (with or without `acc://` prefix and `@account` suffix)

**Response (Delivered Transaction):**
```json
{
  "chains": [
    {
      "chain": "signature",
      "block": 18745449,
      "time": "2026-02-21T19:22:52Z"
    }
  ],
  "status": "delivered",
  "minorBlock": 18745449,
  "majorBlock": 2310
}
```

**Response (Pending Transaction):**
```json
{
  "chains": [
    {
      "chain": "signature",
      "block": 0,
      "time": "2026-02-21T13:22:37-06:00"
    }
  ],
  "status": "pending"
}
```

**Fields:**
- `chains`: Array of chain entries with timestamps
- `status`: Transaction status (`pending` or `delivered`)
- `minorBlock`: Minor block index (partition-specific block number)
- `majorBlock`: Absolute major block number (see below)

**Cache Headers:**
- `X-Cache: HIT-BLOCK`: Served from cache (delivered transaction, never re-queries)
- `X-Cache: HIT-SIG`: Served from cache (pending transaction, will re-query)
- `X-Cache: MISS`: First query, cached for future requests
- `X-Cache: UPDATE`: Updated cached data

**Caching Strategy:**
- **Delivered transactions**: Cached permanently in LevelDB (block data won't change)
- **Pending transactions**: Cached with signature timestamp, re-queried to check for delivery

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "time": "2026-02-23T06:21:53Z"
}
```

## Major Block Calculation

Major blocks occur every 12 hours on Accumulate mainnet (cron: `"0 */12 * * *"`).

### Genesis Reset

The Accumulate network underwent a genesis reset on **July 14, 2025**:
- **Pre-genesis**: October 31, 2022 - July 13, 2025 (blocks 1-1,864)
- **Genesis reset**: July 14, 2025 (block numbers restart at 1)
- **Post-genesis**: July 14, 2025 - present (blocks 1, 2, 3...)

### Absolute Block Numbers

To maintain continuity across the genesis reset, we return **absolute major block numbers**:

```
absoluteBlock = 1864 + postGenesisBlock
```

Where `postGenesisBlock` is calculated from the timestamp:
```
postGenesisBlock = 1 + floor((timestamp - genesisResetTime) / 12hours)
```

**Example:**
- Transaction time: Feb 21, 2026 19:22:52 UTC
- Post-genesis block: 446 (222 days × 2 blocks/day)
- Absolute block: 1864 + 446 = **2310**

**Reference:** See `/home/paul/go/src/gitlab.com/AccumulateNetwork/staking/docs/blocks/block-numbering-offset.md`

## Implementation Details

### Data Sources

1. **Supply Metrics**: Queries Accumulate v3 API (`acc://ACME` account)
2. **Timestamps**: Uses Accumulate v2 `/timestamp/` endpoint for chain entries
3. **Status**: Extracted from v3 API transaction query
4. **Signature Timestamps**: Recursively extracted from nested signature structures

### Database

- **Engine**: LevelDB
- **Location**: `./data/timestamps.db`
- **Schema**: `txid -> TimestampData (JSON)`
- **Persistence**: Survives service restarts

### API Endpoints Used

- **v3 API**: `https://mainnet.accumulatenetwork.io/v3`
  - Supply: `query` method with `scope: "acc://ACME"`
  - Status: `query` method with transaction scope
  - Signatures: Nested in transaction response

- **v2 API**: `https://mainnet.accumulatenetwork.io`
  - Timestamps: `/timestamp/{txid}@unknown`

## Building

```bash
go mod download
go build -o metrics-service
```

## Running Locally

```bash
./metrics-service
```

Service runs on port 8080 by default. Database stored in `./data/timestamps.db`.

## Deployment

### Location

Deployed to `server1:/opt/accumulate-metrics`

### Quick Deploy

```bash
./deploy.sh
```

This will:
1. Build the service for linux/amd64
2. Deploy to server1
3. Install systemd service
4. Restart the service

### Manual Deployment

#### 1. Build

```bash
GOOS=linux GOARCH=amd64 go build -o metrics-service
```

#### 2. Copy to Server

```bash
scp metrics-service server1:/opt/accumulate-metrics/
```

#### 3. Systemd Service

Create `/etc/systemd/system/accumulate-metrics.service`:

```ini
[Unit]
Description=Accumulate Metrics API
After=network.target

[Service]
Type=simple
User=accumulate
WorkingDirectory=/opt/accumulate-metrics
ExecStart=/opt/accumulate-metrics/metrics-service
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable accumulate-metrics
sudo systemctl start accumulate-metrics
```

#### 4. Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name metrics.accumulatenetwork.io;

    ssl_certificate /etc/letsencrypt/live/metrics.accumulatenetwork.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/metrics.accumulatenetwork.io/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS headers (also set by service)
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type" always;
    }
}
```

## Monitoring

### Check Status

```bash
ssh server1 sudo systemctl status accumulate-metrics
```

### View Logs

```bash
ssh server1 sudo journalctl -u accumulate-metrics -f
```

### Test Endpoints

```bash
# Supply metrics
curl https://metrics.accumulatenetwork.io/v1/supply

# Timestamp (delivered transaction)
curl https://metrics.accumulatenetwork.io/v1/timestamp/a46534924b17040b9bbc6098e42be6629202181283e397e3fd770ff5be1e5ee6

# Health check
curl https://metrics.accumulatenetwork.io/health
```

## Explorer Integration

The Accumulate Explorer is configured to use this service in `src/components/common/networks.tsx`:

```typescript
export const Mainnet: NetworkConfig = {
  // ...
  metrics: 'https://metrics.accumulatenetwork.io/v1',
};
```

The Explorer uses:
- `/v1/supply` for ACME supply data on the token page
- `/v1/timestamp/{txid}` for transaction timestamps and block numbers

## References

### Accumulate Core
- **Timestamp Service**: `/home/paul/go/src/gitlab.com/AccumulateNetwork/accumulate/cmd/accumulated-http/timestamp.go`
- **API Types**: `/home/paul/go/src/gitlab.com/AccumulateNetwork/accumulate/pkg/api/v3/`

### Staking Docs
- **Block Offset**: `/home/paul/go/src/gitlab.com/AccumulateNetwork/staking/docs/blocks/block-numbering-offset.md`

### Explorer
- **Timestamp Component**: `/home/paul/go/src/gitlab.com/AccumulateNetwork/explorer/src/components/message/timestamp.tsx`
- **Network Config**: `/home/paul/go/src/gitlab.com/AccumulateNetwork/explorer/src/components/common/networks.tsx`

## Architecture

```
┌─────────────────┐
│   Explorer      │
│  (React App)    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│ Metrics Service │
│   (Port 8080)   │
│                 │
│  ┌───────────┐  │
│  │  LevelDB  │  │  Cache (timestamps)
│  └───────────┘  │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Accumulate     │
│   Mainnet API   │
│  (v2 & v3)      │
└─────────────────┘
```

## Changelog

### 2026-02-23 - Block Information Update
- Added `/v1/timestamp/{txid}` endpoint
- Implemented LevelDB caching for timestamps
- Added minor and major block numbers
- Implemented absolute major block calculation (genesis offset: 1864)
- Added transaction status (pending/delivered)
- Support for signature timestamps on pending transactions

### 2026-02-22 - Initial Implementation
- Created metrics service with `/v1/supply` endpoint
- Query real-time data from Accumulate mainnet
- Basic CORS support
