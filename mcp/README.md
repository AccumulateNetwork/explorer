# Accumulate Explorer MCP Server

Model Context Protocol (MCP) server for the Accumulate Explorer. This allows AI assistants to deploy and interact with the Accumulate blockchain explorer, query accounts, transactions, blocks, and network status.

## Features

### Devnet Deployment
- **start_devnet**: Initialize and start a local Accumulate blockchain network
- **stop_devnet**: Stop the running devnet and clean up resources
- **start_explorer_with_devnet**: One-command deployment of devnet + explorer

### Explorer Deployment
- **start_explorer**: Launch the web explorer server on localhost
- **stop_explorer**: Stop the running explorer server

### Network Management
- **set_network**: Configure which Accumulate network to query
  - Presets: `local-devnet`, `mainnet`, `kermit`, `fozzie`
  - Custom API URLs supported

### Blockchain Queries
- **query_account**: Get account details, balances, and metadata
- **query_transaction**: Retrieve transaction details and status
- **query_block**: Query major or minor blocks by index
- **query_chain**: View chain entries and transaction history
- **network_status**: Get network health and partition info
- **search**: Search by public key, key hash, delegate, or anchor
- **check_network_health**: Test if network is live (same as explorer's green dot)

## Installation

### Prerequisites
- Node.js 20+
- npm or yarn
- The Accumulate Explorer project (parent directory)
- `accumulated` CLI (for devnet deployment) - available from Accumulate Network

### Setup

1. Install dependencies:
```bash
cd mcp
npm install
```

2. Build the MCP server:
```bash
npm run build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "accumulate-explorer": {
      "command": "node",
      "args": ["/path/to/explorer/mcp/dist/index.js"]
    }
  }
}
```

Replace `/path/to/explorer` with the actual path to your explorer directory.

### Standalone Testing

You can test the MCP server using the MCP inspector:

```bash
npm install -g @modelcontextprotocol/inspector
mcp-inspector node dist/index.js
```

## Available Tools

### start_devnet
Initialize and start a local Accumulate devnet.

**Parameters:**
- `bvnCount` (optional): Number of BVN partitions (default: 1)
- `validatorsPerBvn` (optional): Number of validators per partition (default: 1)
- `faucetSeed` (optional): Seed for faucet account to generate test tokens

**Example:**
```json
{
  "bvnCount": 1,
  "validatorsPerBvn": 1,
  "faucetSeed": "test-faucet-seed"
}
```

### stop_devnet
Stop the running devnet and clean up all resources.

### start_explorer_with_devnet
One-command deployment that starts both a devnet and the explorer configured to use it. This is the easiest way to get a complete local development environment.

**Parameters:**
- `port` (optional): Port for the explorer (default: 3000)
- `bvnCount` (optional): Number of BVN partitions (default: 1)
- `validatorsPerBvn` (optional): Number of validators per partition (default: 1)
- `faucetSeed` (optional): Seed for faucet account

**Example:**
```json
{
  "port": 3000,
  "bvnCount": 1,
  "validatorsPerBvn": 1,
  "faucetSeed": "test-faucet-seed"
}
```

### start_explorer
Launch the Accumulate Explorer web interface.

**Parameters:**
- `network` (optional): Network to connect to (`local-devnet`, `mainnet`, `kermit`, `fozzie`)
- `port` (optional): Port to run on (default: 3000)

**Example:**
```json
{
  "network": "local-devnet",
  "port": 3000
}
```

### stop_explorer
Stop the running explorer server.

### set_network
Configure which Accumulate network to query.

**Parameters:**
- `network`: Network API URL or preset name

**Examples:**
```json
{"network": "local-devnet"}
{"network": "mainnet"}
{"network": "http://custom.network:16591"}
```

### query_account
Query an Accumulate account.

**Parameters:**
- `url`: Account URL (e.g., `acc://example.acme` or `acc://example.acme/tokens`)

**Example:**
```json
{"url": "acc://example.acme"}
```

### query_transaction
Get transaction details.

**Parameters:**
- `txid`: Transaction ID/hash

**Example:**
```json
{"txid": "abc123..."}
```

### query_block
Query a block.

**Parameters:**
- `blockIndex`: Block number
- `minor` (optional): Query minor block instead of major block (default: false)

**Example:**
```json
{
  "blockIndex": 1000,
  "minor": false
}
```

### query_chain
Query chain entries for an account.

**Parameters:**
- `url`: Account URL
- `chainName` (optional): Chain name (e.g., `main`, `scratch`)
- `start` (optional): Starting entry index
- `count` (optional): Number of entries to retrieve

**Example:**
```json
{
  "url": "acc://example.acme",
  "chainName": "main",
  "start": 0,
  "count": 10
}
```

### network_status
Get current network status and partition information.

### check_network_health
Check if the current network is live and healthy. This performs the same health check that the explorer uses to display the green dot indicator, PLUS validates CORS configuration.

**Health Check Criteria:**
- CORS headers are properly configured (single `Access-Control-Allow-Origin` header)
- All partitions are responding
- Data is fresh (< 60 seconds old)
- Anchor ledgers are synchronized (within 10 blocks)
- Synthetic message ledgers are synchronized (within 10 blocks)

**Returns:**
- `healthy`: boolean indicating if network is healthy
- `status`: Visual indicator (🟢 Live or 🔴 Unhealthy)
- `details`: Description of health status
- `partitions`: Array of partition information

**Example:**
```json
{}
```

**Response (Healthy):**
```json
{
  "network": "http://127.0.0.1:16591",
  "healthy": true,
  "status": "🟢 Live",
  "details": "All partitions are synchronized and healthy",
  "partitions": [...]
}
```

**Response (Unhealthy - CORS Issue):**
```json
{
  "network": "https://kermit.accumulatenetwork.io",
  "healthy": false,
  "status": "🔴 Unhealthy",
  "details": "CORS configuration error: Duplicate CORS headers detected: *, * (browsers only accept one value)",
  "partitions": []
}
```

**Note:** This check tests actual POST requests to match browser behavior. Some APIs may pass OPTIONS preflight checks but fail on POST requests (e.g., Kermit has duplicate CORS headers on POST but not OPTIONS).

### search
Search the network.

**Parameters:**
- `query`: Search query (public key hash, key hash, etc.)
- `type` (optional): Search type (`publicKey`, `publicKeyHash`, `delegate`, `anchor`)

**Example:**
```json
{
  "query": "abc123...",
  "type": "publicKeyHash"
}
```

## Network Presets

The following network presets are available:

- **local-devnet**: `http://127.0.0.1:16591` - Local development network
- **mainnet**: `https://mainnet.accumulatenetwork.io` - Production network
- **kermit**: `https://kermit.accumulatenetwork.io` - Kermit testnet
- **fozzie**: `https://fozzie.accumulatenetwork.io` - Fozzie testnet

## Example Workflows

### Quick Start: Explorer with Devnet

The easiest way to get started is with a single command:

1. **Start devnet and explorer together:**
   ```
   Use start_explorer_with_devnet with faucetSeed: "my-test-seed"
   ```

2. **Check if the network is live:**
   ```
   Use check_network_health
   ```

3. **Query the faucet account:**
   ```
   Use query_account with url: "acc://faucet.acme/tokens"
   ```

4. **View recent blocks:**
   ```
   Use query_block with blockIndex: 1
   ```

5. **Clean up when done:**
   ```
   Use stop_explorer
   Use stop_devnet
   ```

### Manual Devnet + Explorer Setup

For more control, start components separately:

1. **Start a devnet:**
   ```
   Use start_devnet with bvnCount: 1, validatorsPerBvn: 1
   ```

2. **Verify network is healthy:**
   ```
   Use check_network_health
   ```

3. **Check detailed network status:**
   ```
   Use network_status
   ```

4. **Start the explorer:**
   ```
   Use start_explorer with network: "local-devnet"
   ```

5. **Query an account:**
   ```
   Use query_account with url: "acc://example.acme"
   ```

6. **Clean up when done:**
   ```
   Use stop_explorer
   Use stop_devnet
   ```

### Working with Remote Networks

1. **Connect to mainnet:**
   ```
   Use set_network with network: "mainnet"
   ```

2. **Start explorer for mainnet:**
   ```
   Use start_explorer with network: "mainnet"
   ```

3. **Query production accounts:**
   ```
   Use query_account with url: "acc://example.acme"
   ```

## Development

### Build
```bash
npm run build
```

### Watch mode
```bash
npm run watch
```

## Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `accumulate.js`: Accumulate network SDK for blockchain queries
- `zod`: Schema validation

## Support

For issues or questions:
- Explorer Issues: Create an issue in the explorer repository
- MCP Server: Check the MCP directory README
- Accumulate Network: Visit https://accumulatenetwork.io

## License

MIT
