# Data Account Chain Queries

This document explains how to query data account chains and their entries using the Accumulate Network Explorer's API patterns.

## Overview

Data accounts in Accumulate Network store data entries across multiple chains:
- **Main Chain**: Primary data entries
- **Scratch Chain**: Temporary/draft data entries  
- **Signature Chain**: Transaction signatures

## API Configuration

### Network Setup
```typescript
import { JsonRpcClient } from 'accumulate.js/lib/api_v3';

// API endpoint: {network.api[0]}/v3
const api = new JsonRpcClient('http://127.0.1.1:26660/v3'); // Local devnet
```

### Environment Variables
- `VITE_NETWORK=local` - Connect to local devnet
- `VITE_NETWORK=mainnet` - Connect to mainnet
- `VITE_NETWORK=any` - Allow network switching in UI
- Default local endpoint: `http://127.0.1.1:26660`
- Mainnet endpoint: `https://mainnet.accumulatenetwork.io`

## Curl Examples for Mainnet

These examples demonstrate direct HTTP queries to the Accumulate mainnet API.

### Basic Account Query
```bash
# Query a data account (using a real mainnet data account)
curl -X POST https://mainnet.accumulatenetwork.io/v3 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "query",
    "params": {
      "scope": "acc://staking.acme/requests"
    }
  }'
```

**Response shows data entries in the `entry` field:**
```json
{
  "result": {
    "account": {
      "type": "dataAccount",
      "url": "acc://staking.acme/requests",
      "entry": {
        "type": "doubleHash",
        "data": [
          "4163637532",
          "616374696f6e547970653d6164644163636f756e74",
          "6163636f756e743d6163633a2f2f746573746965746573742e61636d652f7374616b696e67"
        ]
      }
    }
  }
}
```

### Decoding Data Entries
The `data` arrays contain hex-encoded strings. To read the actual data:

```bash
# Decode hex to text (example with first data entry)
echo "4163637532" | xxd -r -p
# Output: "Acc52"

echo "616374696f6e547970653d6164644163636f756e74" | xxd -r -p  
# Output: "actionType=addAccount"

echo "6163636f756e743d6163633a2f2f746573746965746573742e61636d652f7374616b696e67" | xxd -r -p
# Output: "account=acc://testietest.acme/staking"
```

### Query Main Chain
```bash
# Get main chain entries with pagination
curl -X POST https://mainnet.accumulatenetwork.io/v3 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "query",
    "params": {
      "scope": "acc://staking.acme/requests",
      "query": {
        "queryType": "chain",
        "name": "main",
        "range": {
          "start": 0,
          "count": 10,
          "expand": true
        }
      }
    }
  }'
```

### Query Data Entries (writeData transactions)
```bash
# Get recent data entries - look for writeData transactions in the results
# Note: You need to filter the results for transactions with body.type = "writeData"
curl -X POST https://mainnet.accumulatenetwork.io/v3 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "query",
    "params": {
      "scope": "acc://staking.acme/requests",
      "query": {
        "queryType": "chain",
        "name": "main",
        "range": {
          "start": 280,
          "count": 5,
          "expand": true
        }
      }
    }
  }'
```

### Query Scratch Chain
```bash
# Get scratch chain entries
curl -X POST https://mainnet.accumulatenetwork.io/v3 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "query",
    "params": {
      "scope": "acc://staking.acme/requests",
      "query": {
        "queryType": "chain",
        "name": "scratch",
        "range": {
          "start": 0,
          "count": 5,
          "expand": true
        }
      }
    }
  }'
```

### Query Chain Summary
```bash
# Get chain counts and metadata
curl -X POST https://mainnet.accumulatenetwork.io/v3 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "query",
    "params": {
      "scope": "acc://staking.acme/requests",
      "query": {
        "queryType": "chain"
      }
    }
  }'
```

### Query Pending Transactions
```bash
# Get pending transactions
curl -X POST https://mainnet.accumulatenetwork.io/v3 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "query",
    "params": {
      "scope": "acc://staking.acme/requests",
      "query": {
        "queryType": "pending",
        "range": {
          "start": 0,
          "count": 10,
          "expand": true
        }
      }
    }
  }'
```

### Query Directory (for ADI accounts)
```bash
# Get sub-accounts in an ADI (using accumulate.acme as example)
curl -X POST https://mainnet.accumulatenetwork.io/v3 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "query",
    "params": {
      "scope": "acc://accumulate.acme",
      "query": {
        "queryType": "directory",
        "range": {
          "start": 0,
          "count": 20,
          "expand": false
        }
      }
    }
  }'
```

### Query Specific Transaction
```bash
# Query by transaction ID
curl -X POST https://mainnet.accumulatenetwork.io/v3 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "query",
    "params": {
      "scope": "01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef"
    }
  }'
```

### Submit Transaction (Write Data)
```bash
# Submit a writeData transaction
curl -X POST https://mainnet.accumulatenetwork.io/v3 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "submit",
    "params": {
      "envelope": {
        "transaction": [
          {
            "header": {
              "principal": "acc://example.acme/data"
            },
            "body": {
              "type": "writeData",
              "entry": {
                "type": "doubleHash",
                "data": ["SGVsbG8gV29ybGQ="]
              }
            }
          }
        ],
        "signatures": [
          {
            "type": "ed25519",
            "publicKey": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            "signature": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            "signer": "acc://example.acme/book/1",
            "signerVersion": 1
          }
        ]
      }
    }
  }'
```

### Response Format Examples

#### Successful Account Query Response
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "type": "account",
    "account": {
      "url": "acc://example.acme/data",
      "type": "dataAccount",
      "entry": {
        "type": "doubleHash",
        "data": ["SGVsbG8gV29ybGQ="]
      }
    },
    "receipt": {
      "localBlock": 12345,
      "proof": "..."
    }
  }
}
```

#### Chain Query Response
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "type": "recordSet",
    "records": [
      {
        "account": "acc://example.acme/data",
        "chain": "main",
        "index": 0,
        "entry": 1,
        "value": {
          "type": "transaction",
          "txid": "01234567890abcdef...",
          "transaction": {
            "header": {
              "principal": "acc://example.acme/data"
            },
            "body": {
              "type": "writeData",
              "entry": {
                "type": "doubleHash",
                "data": ["SGVsbG8gV29ybGQ="]
              }
            }
          }
        }
      }
    ],
    "total": 1,
    "start": 0,
    "count": 1
  }
}
```

#### Error Response
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "account does not exist",
    "data": {
      "type": "notFound",
      "account": "acc://nonexistent.acme/data"
    }
  }
}
```

## Basic Account Queries

### Get Account Information
```typescript
import { fetchAccount } from './components/common/query';
import { DataAccount, LiteDataAccount } from 'accumulate.js/lib/core';

// Query any data account
const account = await api.query(accountUrl).catch(isErrorRecord);

// Query specific data account type
const dataAccount = await fetchAccount(api, accountUrl, DataAccount);
const liteDataAccount = await fetchAccount(api, accountUrl, LiteDataAccount);
```

## Chain Queries

### Query Specific Chains
```typescript
// Query main chain
const mainChain = await api.query(accountUrl, {
  queryType: 'chain',
  name: 'main',
  range: { 
    start: 0, 
    count: 10,
    expand: true  // Include full transaction details
  }
});

// Query scratch chain
const scratchChain = await api.query(accountUrl, {
  queryType: 'chain', 
  name: 'scratch',
  range: { expand: true }
});

// Query signature chain
const signatureChain = await api.query(accountUrl, {
  queryType: 'chain',
  name: 'signature', 
  range: { expand: true }
});
```

### Query All Chains Summary
```typescript
// Get chain counts and metadata
const chainSummary = await api.query(accountUrl, { 
  queryType: 'chain' 
});

// Returns counts for main, scratch, and signature chains
const counts = {
  main: chainSummary.records.find(r => r.name === 'main')?.total || 0,
  scratch: chainSummary.records.find(r => r.name === 'scratch')?.total || 0, 
  signature: chainSummary.records.find(r => r.name === 'signature')?.total || 0
};
```

## Data Entry Queries

### Using DataChain Class
```typescript
import { DataChain } from './utils/DataChain';

// Create DataChain instance for combined main/scratch data
const dataChain = new DataChain(accountUrl, api);

// Get paginated data entries
await dataChain.getRange({ start: 0, count: 20 });

// Access results
const entries = dataChain.records;      // Combined entries from both chains
const total = dataChain.total;          // Total entry count
```

### Manual Chain Filtering
```typescript
import { ChainFilter } from './utils/ChainFilter';

// Filter for data transactions only
const mainDataFilter = new ChainFilter(
  api,
  accountUrl,
  { queryType: 'chain', name: 'main', range: { expand: true } },
  (record) => isRecordOfDataTxn(record)  // Filter function
);

// Get filtered results
const dataEntries = await mainDataFilter.getRange({ start: 0, count: 10 });
```

## Pending Transactions

### Query Pending Transactions
```typescript
// Get pending transaction count
const pendingCount = await api.query(accountUrl, {
  queryType: 'pending',
  range: { count: 0 }  // Just get count, no records
});

// Get pending transactions with details
const pendingTxns = await api.query(accountUrl, {
  queryType: 'pending', 
  range: { 
    start: 0,
    count: 10,
    expand: true
  }
});
```

## React Integration Patterns

### Using queryEffect Hook
```typescript
import { queryEffect } from './components/common/query';

// In React component
const MyComponent = ({ accountUrl }) => {
  const [entries, setEntries] = useState([]);
  
  // Query data entries
  queryEffect(accountUrl, {
    queryType: 'chain',
    name: 'main', 
    range: { expand: true }
  }).then((result) => {
    if (result.recordType === RecordType.Range) {
      setEntries(result.records);
    }
  });
  
  return <div>{/* Render entries */}</div>;
};
```

### Pagination Example
```typescript
const DataLedger = ({ scope }) => {
  const { api } = useContext(Network);
  const [dataChain] = useState(new DataChain(scope, api));
  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({
    pageSize: 10,
    current: 1,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100']
  });

  // Load data based on pagination
  useEffect(() => {
    const { current, pageSize } = pagination;
    const start = (current - 1) * pageSize;
    
    dataChain.getRange({ start, count: pageSize }).then(() => {
      setEntries(dataChain.records.slice(start, start + pageSize));
    });
  }, [pagination]);

  return (
    <Table 
      dataSource={entries}
      pagination={pagination}
      onChange={setPagination}
    />
  );
};
```

## Advanced Query Patterns

### Directory Queries (for ADI accounts)
```typescript
// Query sub-accounts in an ADI
const directory = await api.query(adiUrl, {
  queryType: 'directory',
  range: { 
    start: 0, 
    count: 50,
    expand: false  // Just get URLs, not full account details
  }
});
```

### Transaction History with Filtering
```typescript
// Get all transactions for an account
const allChains = await Promise.all([
  api.query(accountUrl, { queryType: 'chain', name: 'main', range: { expand: true } }),
  api.query(accountUrl, { queryType: 'chain', name: 'scratch', range: { expand: true } }),
  api.query(accountUrl, { queryType: 'pending', range: { expand: true } })
]);

// Combine and sort by timestamp
const allTransactions = allChains
  .flatMap(chain => chain.records || [])
  .filter(record => record.value?.received)  // Has timestamp
  .sort((a, b) => (b.value.received || 0) - (a.value.received || 0));
```

## Error Handling

### Robust Query Pattern
```typescript
const queryAccountSafely = async (url) => {
  try {
    const result = await api.query(url).catch(isErrorRecord);
    
    if (isRecordOf(result, Status.NotFound)) {
      return { error: 'Account not found' };
    }
    
    if (result.recordType === RecordType.Error) {
      return { error: result.value.message };
    }
    
    if (result.recordType === RecordType.Account) {
      return { account: result.account };
    }
    
    return { error: 'Unexpected response type' };
    
  } catch (error) {
    return { error: error.message };
  }
};
```

## Performance Considerations

### Efficient Data Loading
```typescript
// Use expand: true only when you need full transaction details
const lightweightQuery = {
  queryType: 'chain',
  name: 'main',
  range: { 
    start: 0, 
    count: 100,
    expand: false  // Faster, less data
  }
};

// Use filtering to reduce data transfer
const dataOnlyFilter = (record) => {
  return record.value?.message?.type === MessageType.Transaction &&
         record.value.message.transaction.body.type === 'writeData';
};
```

### Caching Strategy
```typescript
// Cache frequently accessed data
const accountCache = new Map();

const getCachedAccount = async (url) => {
  const key = url.toString();
  if (accountCache.has(key)) {
    return accountCache.get(key);
  }
  
  const account = await fetchAccount(api, url);
  accountCache.set(key, account);
  return account;
};
```

## Actual Implementation Code

The Accumulate Network Explorer uses several classes and utilities to fetch data entries efficiently. Here are the actual implementations:

### DataLedger Component

The main React component that displays data entries with pagination:

```typescript
export function DataLedger({ scope }: { scope: URL }) {
  const { api, network } = useContext(Network);
  const [dataChain] = useState(new DataChain(scope, api));
  const [entries, setEntries] = useState<TxnEntry[]>(null);
  const [tableIsLoading, setTableIsLoading] = useState(true);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ['2', '10', '20', '50', '100'],
    current: 1,
    hideOnSinglePage: true,
    showTotal(_, range) {
      const { total } = dataChain;
      if (typeof total !== 'number') {
        return;
      }
      return `${range[0]}-${range[1]} of ${total}`;
    },
  });
  const [totalEntries, setTotalEntries] = useState(-1);

  useAsyncEffect(
    async (mounted) => {
      setTableIsLoading(true);
      const r = await dataChain.getRange({
        start: (pagination.current - 1) * pagination.pageSize,
        count: pagination.pageSize,
      });
      if (!mounted()) return;

      let { total } = r;
      if (typeof total !== 'number') {
        // Pretend that we have another page to make pagination work
        total = (pagination.current + 1) * pagination.pageSize;
      }

      setEntries(r.records);
      setPagination({ ...pagination, total });
      setTotalEntries(r.total);
      setTableIsLoading(false);
    },
    [scope.toString(), JSON.stringify(pagination), network.id],
  );

  // Table columns configuration...
  const columns = [
    {
      title: '#',
      render: (entry: DataTxnEntry) => <DataLedger.Index entry={entry} />,
    },
    {
      title: 'ID',
      className: 'code',
      render: (entry: DataTxnEntry) => <DataLedger.ID entry={entry} />,
    },
    {
      title: 'Entry Data',
      render: (entry: DataTxnEntry) => <DataLedger.EntryData entry={entry} />,
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginTop: 30 }}>
        Data Entries
        {(totalEntries || totalEntries == 0) && <Count count={totalEntries} />}
      </Title>
      <Table
        dataSource={entries}
        columns={columns}
        pagination={pagination}
        rowKey="entry"
        loading={tableIsLoading}
        onChange={(p) => setPagination(p)}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
}
```

### DataChain Class

Core class that manages fetching data from both main and scratch chains:

```typescript
export class DataChain {
  readonly #main: ChainFilter<TxnEntry>;
  readonly #scratch: ChainFilter<TxnEntry>;
  readonly #results = new RecordRange<TxnEntry>({ records: [] });
  readonly #start = { main: 0, scratch: 0 };

  constructor(scope: URL, api: JsonRpcClient) {
    this.#main = new ChainFilter(
      api,
      scope,
      { queryType: 'chain', name: 'main', range: { expand: true } },
      (r) => isRecordOfDataTxn(r),
    );
    this.#scratch = new ChainFilter(
      api,
      scope,
      { queryType: 'chain', name: 'scratch', range: { expand: true } },
      (r) => {
        return isRecordOfDataTxn(r);
      },
    );
  }

  get total() {
    const { total: t1 } = this.#main;
    const { total: t2 } = this.#scratch;
    if (typeof t1 === 'number' && typeof t2 === 'number') {
      return t1 + t2;
    }
  }

  async getRange(range: RangeOptions | RangeOptionsArgs) {
    if (!(range instanceof RangeOptions)) {
      range = new RangeOptions(range);
    }
    if (range.fromEnd) {
      throw new Error('from end not supported');
    }

    const records = [];
    for (let i = 0; i < range.count; i++) {
      const r = await this.getIndex(range.start + i);
      if (!r) break;
      records.push(r);
    }
    return new RecordRange<ChainEntryRecord<TxnRecord>>({
      start: range.start,
      records,
      total: this.total,
    });
  }

  async getIndex(index: number) {
    while (index >= this.#results.records.length) {
      if (typeof this.total == 'number') {
        return null;
      }
      await this.#getNext();
    }
    return this.#results.records[index];
  }

  async #getNext() {
    const count = 50;
    const [{ records: main }, { records: scratch }] = await Promise.all([
      this.#main.getRange({ start: this.#start.main, count }),
      this.#scratch.getRange({ start: this.#start.scratch, count }),
    ]);
    this.#start.main += count;
    this.#start.scratch += count;

    // Merge and deduplicate results
    this.#results.records.push(...main, ...scratch);
    const seen = new Set();
    this.#results.records = this.#results.records.filter((x) => {
      const h = Buffer.from(x.value.id.hash).toString('hex');
      if (seen.has(h)) return false;
      seen.add(h);
      return true;
    });
    
    // Sort by chain name and index/timestamp
    this.#results.records.sort((a, b) => {
      if (a.name === b.name) {
        return (b.index || 0) - (a.index || 0);
      }
      return (b.value.received || 0) - (a.value.received || 0);
    });
  }
}
```

### ChainFilter Class

Handles querying individual chains with filtering and pagination:

```typescript
export class ChainFilter<R extends Record & { index?: number }> {
  readonly #scope: URL;
  readonly #query: Query;
  readonly #api: JsonRpcClient;
  readonly #filter?: (r: R) => boolean;
  readonly #results = new RecordRange<R>({ records: [] });

  constructor(
    api: JsonRpcClient,
    scope: URLArgs,
    query: QueryArgs,
    filter?: (r: R) => boolean,
  ) {
    this.#scope = URL.parse(scope);
    this.#query = Query.fromObject(query);
    this.#api = api;
    this.#filter = filter;
  }

  get total() {
    return this.#results.total;
  }

  async getRange(range: RangeOptions | RangeOptionsArgs) {
    if (!(range instanceof RangeOptions)) {
      range = new RangeOptions(range);
    }
    if (range.fromEnd) {
      throw new Error('from end not supported');
    }

    const records = [];
    for (let i = 0; i < range.count; i++) {
      const r = await this.getIndex(range.start + i);
      if (!r) break;
      records.push(r);
    }
    return new RecordRange<R>({
      start: range.start,
      records,
      total: this.#results.total,
    });
  }

  async getIndex(index: number) {
    while (index >= this.#results.records.length) {
      if (
        typeof this.#results.total == 'number' &&
        index >= this.#results.total
      ) {
        return null;
      }
      await this.#getNext();
    }
    return this.#results.records[index];
  }

  async #getNext() {
    const maxCount = 50;
    if (this.#results.records.length == 0) {
      // Initial query from the end
      const r = (await this.#api.query(
        this.#scope,
        this.#makeQuery({
          start: 0,
          count: maxCount,
          fromEnd: true,
        }),
      )) as unknown as RecordRange<R>;
      
      if (!r.total) {
        this.#results.total = 0;
        return;
      }
      if (!r.records) {
        r.records = [];
      }

      for (const entry of r.records.reverse()) {
        if (!this.#filter || this.#filter(entry)) {
          this.#results.records.push(entry);
        }
      }
      if (!this.#filter) {
        this.#results.total = r.total;
      } else if (r.start + r.records.length >= r.total) {
        this.#results.total = this.#results.records.length;
      }
      return;
    }

    // Continue fetching backwards from the last entry
    const end = this.#results.records[this.#results.records.length - 1].index;
    if (end == 0) {
      this.#results.total = this.#results.records.length;
      return;
    }

    let start = end - maxCount;
    let count = maxCount;
    if (start < 0) {
      start = 0;
      count = end;
    }

    const { records } = (await this.#api.query(
      this.#scope,
      this.#makeQuery({
        start,
        count,
        fromEnd: false,
        expand: true,
      }),
    )) as unknown as RecordRange<R>;

    for (const r of records.reverse()) {
      if (!this.#filter || this.#filter(r)) {
        this.#results.records.push(r);
      }
    }
    if (start == 0) {
      this.#results.total = this.#results.records.length;
    }
  }

  #makeQuery(range: RangeOptionsArgs): any {
    // Make a copy of the original arguments
    const query = this.#query.copy();

    // Find a property that is a range and modify it
    for (const prop in query) {
      if (query[prop] instanceof RangeOptions) {
        query[prop] = new RangeOptions({
          ...query[prop],
          ...range,
        });
        return query;
      }
    }

    // If no range property is found, use 'range'
    return Query.fromObject({
      ...query.asObject(),
      range,
    } as any);
  }
}
```

### Utility Function: fetchDataEntries

Simple utility for fetching all data entries from the main chain:

```typescript
export async function fetchDataEntries(
  api: JsonRpcClient,
  scope: URLArgs,
  predicate?: (_: DataEntry) => boolean,
) {
  const results: DataEntry[] = [];
  for (let start = 0; ; ) {
    const { records = [], total = 0 } = (await api.query(scope, {
      queryType: 'chain',
      name: 'main',
      range: {
        start,
        expand: true,
      },
    })) as RecordRange<TxnEntry>;

    for (const r of records) {
      if (!isRecordOfDataTxn(r)) {
        continue;
      }
      const { entry } = r.value.message.transaction.body;
      if (!predicate || predicate(entry)) {
        results.push(entry);
      }
    }
    start += records.length;
    if (start >= total) {
      break;
    }
  }
  return results;
}
```

### Key Implementation Details

1. **Dual Chain Querying**: The `DataChain` class queries both main and scratch chains simultaneously
2. **Lazy Loading**: Data is fetched in chunks of 50 records as needed
3. **Deduplication**: Results are deduplicated by transaction hash
4. **Sorting**: Entries are sorted by chain name and then by index/timestamp
5. **Filtering**: Only data transactions are included using `isRecordOfDataTxn()`
6. **Pagination**: The UI supports configurable page sizes (2, 10, 20, 50, 100)
7. **Reverse Iteration**: Chains are queried from the end first to show latest entries

## Common Query Examples

### Get Latest Data Entries
```typescript
const getLatestDataEntries = async (accountUrl, limit = 10) => {
  const dataChain = new DataChain(accountUrl, api);
  await dataChain.getRange({ start: 0, count: limit });
  
  return dataChain.records
    .filter(entry => entry.value?.message?.transaction?.body?.type === 'writeData')
    .slice(0, limit);
};
```

### Search for Specific Data
```typescript
const searchDataEntries = async (accountUrl, searchTerm) => {
  const dataChain = new DataChain(accountUrl, api);
  await dataChain.getRange({ start: 0, count: 1000 }); // Adjust as needed
  
  return dataChain.records.filter(entry => {
    const data = entry.value?.message?.transaction?.body?.entry?.data;
    return data && Buffer.from(data).toString().includes(searchTerm);
  });
};
```

### Monitor Account Activity
```typescript
const monitorAccount = async (accountUrl, callback) => {
  let lastKnownCount = 0;
  
  const checkForUpdates = async () => {
    const summary = await api.query(accountUrl, { queryType: 'chain' });
    const currentCount = summary.records.reduce((sum, chain) => sum + (chain.total || 0), 0);
    
    if (currentCount > lastKnownCount) {
      const newEntries = await getLatestDataEntries(accountUrl, currentCount - lastKnownCount);
      callback(newEntries);
      lastKnownCount = currentCount;
    }
  };
  
  // Poll every 5 seconds
  setInterval(checkForUpdates, 5000);
};
```

## References

- **API Documentation**: `accumulate.js/lib/api_v3`
- **Core Types**: `accumulate.js/lib/core`
- **Network Configuration**: `src/components/common/networks.tsx`
- **Query Utilities**: `src/components/common/query.ts`
- **Chain Utilities**: `src/utils/DataChain.ts`, `src/utils/ChainFilter.ts`
