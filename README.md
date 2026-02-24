# Accumulate Explorer

A web-based blockchain explorer for the Accumulate protocol, providing real-time network monitoring, transaction tracking, and account inspection across multiple Accumulate networks.

> **🤖 For AI Assistants:** See [AI-README.md](AI-README.md) for quick reference on deployment, architecture, and common tasks.

## Features

### Multi-Network Support
- **Mainnet** - Production Accumulate network
- **Kermit Testnet** - Primary test network with ETH endpoint support
- **Fozzie Testnet** - Secondary test network
- **Local Devnet** - Local development blockchain

### Core Functionality
- **Account Explorer** - View account details, balances, and transaction history
- **Transaction Tracking** - Search and inspect transactions with signature details
- **Block Explorer** - Browse major and minor blocks with full chain data
- **Network Health Monitoring** - Real-time network status with partition synchronization checks
- **Search** - Search by account URL, transaction ID, public key, or key hash
- **Web3 Wallet Integration** - Connect via MetaMask or WalletConnect

### Network Health Indicators
Visual status indicators show real-time network health:
- 🟢 **Green** - All partitions synchronized and healthy
- 🟡 **Yellow** - Network experiencing synchronization delays
- ⚪ **Gray** - Loading or checking network status

Health checks validate:
- CORS configuration (browser compatibility)
- Partition synchronization (< 10 blocks lag)
- Anchor ledger synchronization
- Synthetic message ledger synchronization
- Data freshness (< 60 seconds old)

## MCP Server Integration

The Explorer includes a production-ready Model Context Protocol (MCP) server that enables AI assistants to interact with Accumulate networks.

### MCP Features
- **Devnet Management** - Start/stop local Accumulate blockchain
- **Explorer Control** - Launch web interface for any network
- **Network Queries** - Query accounts, transactions, blocks, and chains
- **Health Checks** - Comprehensive network validation matching browser behavior
- **Network Switching** - Connect to mainnet, testnets, or custom endpoints

### MCP Documentation
- [MCP README](mcp/README.md) - Complete usage guide with examples
- [MCP Implementation](mcp/IMPLEMENTATION.md) - Technical details and architecture
- [Health Check Investigation](mcp/EXPLORER_HEALTH_CHECK.md) - CORS validation details

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Open browser to http://localhost:5173
```

### Build for Production

```bash
# Create optimized production build
npm run build

# Build output will be in build/ directory
# Deploy build/ contents to your web server
```

### Configuration

The explorer automatically detects the network based on hostname:
- `kermit.explorer.accumulatenetwork.io` → Kermit Testnet
- `fozzie.explorer.accumulatenetwork.io` → Fozzie Testnet
- `localhost` → Local Devnet (or last selected network)
- Other domains → Mainnet (or last selected network)

Network switching is enabled when `VITE_NETWORK=any` environment variable is set.

## Development

### Available Scripts

```bash
npm start         # Start dev server with hot reload
npm run build     # Build for production
npm run check     # Run TypeScript type checking
npm run format    # Format code with Prettier
npm run preview   # Build and preview production build
```

### Project Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Network.tsx       # Network context and health checks
│   │   └── networks.tsx      # Network configurations
│   ├── explorer/             # Explorer UI components
│   ├── views/                # Page views
│   └── web3/                 # Web3 wallet integration
├── utils/                    # Utility functions
├── sdk-patches.ts            # SDK compatibility patches
├── index.tsx                 # App entry point
└── App.tsx                   # Main app component

mcp/
├── src/
│   └── index.ts              # MCP server implementation
├── README.md                 # MCP usage guide
├── IMPLEMENTATION.md         # Technical documentation
└── test-*.js                 # Health check tests
```

## Network-Specific Features

### Local Devnet
- **Visual Indicator**: Maroon top bar (#4B0000)
- **Default Port**: 26660
- **ETH Endpoint**: http://127.0.0.1:26660/eth

### Testnets (Kermit/Fozzie)
- **Visual Indicator**: Dark purple top bar (#2D1640)
- **Kermit ETH Support**: https://kermit.accumulatenetwork.io/eth

### Mainnet
- **Metrics Dashboard**: https://metrics.accumulatenetwork.io/v1
- **Production Explorer**: https://explorer.accumulatenetwork.io

## Deployment

### Quick Deployment (Netlify)

Both production and beta are hosted on Netlify with auto-deployment:

**Deploy to Beta:**
```bash
git push github develop:updates
```

**Deploy to Production:**
```bash
git push github develop:main
```

Netlify automatically builds and deploys in ~2 minutes.

### Sites
- **Production:** https://explorer.accumulatenetwork.io (GitHub `main` branch)
- **Beta:** https://beta.explorer.accumulatenetwork.io (GitHub `updates` branch)
- **Build Config:** `netlify.toml`

### Detailed Guide
See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment documentation.

## Testing

Comprehensive testing procedures are documented:
- [TESTING.md](TESTING.md) - Testing strategy and checklists
- [TEST-RESULTS.md](TEST-RESULTS.md) - Test execution results

### Quick Test

```bash
# Start dev server
npm start

# Open http://localhost:5173
# Verify:
# - Page loads without errors
# - Network dropdown appears
# - Can switch between networks
# - Health indicators show status dots
```

## Browser Compatibility

Supports modern browsers:
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)

Requires JavaScript enabled and CORS-compatible API endpoints.

## Technology Stack

- **React 17** - UI framework
- **TypeScript 5** - Type safety
- **Vite 5** - Build tool and dev server
- **Ant Design 4** - UI component library
- **accumulate.js 0.11** - Accumulate protocol SDK
- **ethers.js 6** - Ethereum wallet integration
- **@web3modal/ethers 5** - WalletConnect integration

## Known Issues

### TypeScript Type Warnings
Non-blocking type errors in WalletConnect/MetaMask type declarations. Does not affect runtime.

### npm Vulnerabilities
Known vulnerabilities in axios (used by accumulate.js). Monitoring for SDK updates.

## Contributing

### Code Style
- TypeScript strict mode
- Prettier formatting (configured in package.json)
- Imports sorted automatically

```bash
# Format code
npm run format

# Check types
npm run check
```

## License

See LICENSE file for details.

## Support

- **Repository**: gitlab.com/AccumulateNetwork/explorer
- **Issues**: Report bugs via GitLab issues
- **Documentation**: See docs in mcp/ directory

## Version History

**Current Version**: 0.1.0

Recent improvements:
- ✅ Network switching with automatic cache validation
- ✅ MCP server for AI assistant integration
- ✅ Enhanced network health monitoring with CORS validation
- ✅ Web3 wallet integration (MetaMask, WalletConnect)
- ✅ Network-specific UI colors
- ✅ ETH endpoint support for Kermit and local devnets

---

Built with ❤️ for the Accumulate community
