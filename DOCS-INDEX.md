# Documentation Index

Quick navigation to all Explorer documentation.

## 🤖 For AI Assistants

**Start here:** [AI-README.md](AI-README.md)
- Quick reference for common tasks
- Deployment instructions
- Architecture overview
- Troubleshooting guide

## 👤 For Humans

### Getting Started
- [README.md](README.md) - Project overview, features, installation
- [DEPLOYMENT.md](DEPLOYMENT.md) - How to deploy (Netlify, SSH)
- [TESTING.md](TESTING.md) - Testing procedures and checklists

### Development
- [AI-README.md](AI-README.md) - Quick reference (good for humans too!)
- `src/` - Source code
- `mcp/` - MCP server for AI integration
- `metrics-service/` - Go metrics API service

### Deployment & Operations
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment procedures
  - **Netlify (Recommended):** Section at top
  - **SSH/Manual:** Alternative methods
- [DEPLOYMENT-REPORT.md](DEPLOYMENT-REPORT.md) - Recent deployment reports
- `docs/deployments/` - Historical deployment notes

### Testing & Quality
- [TESTING.md](TESTING.md) - Comprehensive testing strategy
- [TEST-RESULTS.md](TEST-RESULTS.md) - Test execution results
- `docs/testing/` - Detailed test reports

### Security
- [VULNERABILITIES.md](VULNERABILITIES.md) - Known vulnerabilities assessment
- [HOTFIX-SUMMARY.md](HOTFIX-SUMMARY.md) - Emergency fix documentation

### Technical Deep Dives
- [mcp/IMPLEMENTATION.md](mcp/IMPLEMENTATION.md) - MCP server architecture
- [metrics-service/README.md](metrics-service/README.md) - Metrics API documentation
- [metrics-service/STAKING_ACCOUNTS.md](metrics-service/STAKING_ACCOUNTS.md) - Staking account detection

## 📁 Documentation Structure

```
/
├── AI-README.md                    # 🤖 AI quick reference
├── README.md                       # 👤 Project overview
├── DEPLOYMENT.md                   # 📦 Deployment guide
├── TESTING.md                      # 🧪 Testing guide
├── DOCS-INDEX.md                   # 📚 This file
│
├── docs/
│   ├── deployments/                # Historical deployment notes
│   └── testing/                    # Detailed test reports
│
├── mcp/
│   ├── README.md                   # MCP usage guide
│   └── IMPLEMENTATION.md           # MCP technical details
│
└── metrics-service/
    ├── README.md                   # Metrics API overview
    └── STAKING_ACCOUNTS.md         # Staking implementation

```

## 🔍 Finding What You Need

### "How do I deploy?"
→ [AI-README.md](AI-README.md) (Quick) or [DEPLOYMENT.md](DEPLOYMENT.md) (Detailed)

### "How do I test?"
→ [TESTING.md](TESTING.md)

### "What's the project structure?"
→ [README.md](README.md) or [AI-README.md](AI-README.md)

### "How does X work?"
→ Check [AI-README.md](AI-README.md) first, then README.md

### "Where are the metrics API docs?"
→ [metrics-service/README.md](metrics-service/README.md)

### "How do I fix a bug?"
→ [AI-README.md](AI-README.md) has troubleshooting section

## 📝 Contributing to Docs

When adding new documentation:

1. Add entry to this index
2. Link from README.md if user-facing
3. Link from AI-README.md if commonly needed
4. Use clear file names (ACTION-TOPIC.md)
5. Include "Last Updated" date

### Documentation Naming Convention

- `README.md` - Overview/introduction
- `DEPLOYMENT*.md` - Deployment procedures
- `TESTING*.md` - Testing procedures
- `AI-*.md` - AI-optimized documentation
- `*-REPORT.md` - Historical reports
- `*-SUMMARY.md` - Summary/recap documents
