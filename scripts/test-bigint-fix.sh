#!/bin/bash
#
# Test Script for BigInt Transaction Display Fix
#
# Purpose: Verify that the SendTokens.tsx fix correctly handles multi-output
#          transactions with BigInt arithmetic
#
# Tests: Creates transactions with multiple recipients to trigger the
#        reduce() code path that previously threw "Cannot mix BigInt" errors
#
# Usage: ./test-bigint-fix.sh [--skip-devnet-start]
#

set -e

# Configuration
DEVNET_DIR="${DEVNET_DIR:-/home/paul/go/src/gitlab.com/AccumulateNetwork/devnet}"
API_URL="http://127.0.0.1:26660/v3"
EXPLORER_DIR="$(dirname "$(dirname "$(realpath "$0")")")"
LOG_FILE="/tmp/bigint-test-$(date +%s).log"
SKIP_DEVNET_START=false

# Parse arguments
if [[ "$1" == "--skip-devnet-start" ]]; then
    SKIP_DEVNET_START=true
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +%T)]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
log "Checking prerequisites..."

if [[ ! -d "$DEVNET_DIR" ]]; then
    error "Devnet directory not found: $DEVNET_DIR"
    exit 1
fi

if [[ ! -f "$DEVNET_DIR/devnet" ]]; then
    error "Devnet binary not found. Run: cd $DEVNET_DIR && make"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    error "jq is required but not installed"
    exit 1
fi

if ! command -v accumulate &> /dev/null; then
    error "accumulate CLI not found in PATH"
    exit 1
fi

success "All prerequisites met"

# Step 1: Start Devnet (unless skipped)
if [[ "$SKIP_DEVNET_START" == false ]]; then
    log "Starting devnet..."
    cd "$DEVNET_DIR"

    # Check if already running
    if ./devnet status 2>&1 | grep -q "Network: RUNNING"; then
        warn "Devnet already running"
    else
        ./devnet start 2>&1 | tee -a "$LOG_FILE"
        sleep 3

        if ./devnet status 2>&1 | grep -q "Network: RUNNING"; then
            success "Devnet started successfully"
        else
            error "Failed to start devnet"
            exit 1
        fi
    fi
else
    log "Skipping devnet start (--skip-devnet-start)"
fi

# Step 2: Create test lite accounts
log "Creating test lite accounts..."

# Generate lite account addresses (deterministic for testing)
SENDER="acc://$(echo -n "bigint-test-sender" | sha256sum | cut -c1-40)/ACME"
RECIPIENT1="acc://$(echo -n "bigint-test-recipient1" | sha256sum | cut -c1-40)/ACME"
RECIPIENT2="acc://$(echo -n "bigint-test-recipient2" | sha256sum | cut -c1-40)/ACME"
RECIPIENT3="acc://$(echo -n "bigint-test-recipient3" | sha256sum | cut -c1-40)/ACME"

log "Sender:     $SENDER"
log "Recipient1: $RECIPIENT1"
log "Recipient2: $RECIPIENT2"
log "Recipient3: $RECIPIENT3"

# Step 3: Fund sender account
log "Funding sender account via faucet..."

curl -s -X POST "$API_URL" -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"faucet\",\"params\":{\"url\":\"$SENDER\"},\"id\":1}" | \
  jq -r '.error.message // "Success"' | tee -a "$LOG_FILE"

sleep 2

# Verify funding
BALANCE=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"query\",\"params\":{\"url\":\"$SENDER\"},\"id\":1}" | \
  jq -r '.result.data.balance // "0"')

if [[ "$BALANCE" == "0" ]]; then
    error "Failed to fund sender account"
    exit 1
fi

success "Sender funded with $BALANCE nanoACME ($(echo "scale=8; $BALANCE / 100000000" | bc) ACME)"

# Step 4: Create multi-output transaction (THIS IS THE CRITICAL TEST)
log "Creating multi-output transaction..."
log "This will trigger the reduce() code path in SendTokens.tsx"

# Use accumulate CLI to create a transaction with multiple recipients
# Note: The CLI may not support multiple --to flags directly, so we'll use the JSON-RPC API

# Amounts in nanoACME
AMOUNT1="2550000000"  # 25.50 ACME
AMOUNT2="3075000000"  # 30.75 ACME
AMOUNT3="1525000000"  # 15.25 ACME
TOTAL_EXPECTED="7150000000"  # 71.50 ACME

log "Sending:"
log "  → $RECIPIENT1: $(echo "scale=2; $AMOUNT1 / 100000000" | bc) ACME"
log "  → $RECIPIENT2: $(echo "scale=2; $AMOUNT2 / 100000000" | bc) ACME"
log "  → $RECIPIENT3: $(echo "scale=2; $AMOUNT3 / 100000000" | bc) ACME"
log "  Total: $(echo "scale=2; $TOTAL_EXPECTED / 100000000" | bc) ACME"

# Create transaction via JSON-RPC execute method
TX_RESULT=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "execute",
    "params": {
      "from": "'"$SENDER"'",
      "to": [
        {"url": "'"$RECIPIENT1"'", "amount": '"$AMOUNT1"'},
        {"url": "'"$RECIPIENT2"'", "amount": '"$AMOUNT2"'},
        {"url": "'"$RECIPIENT3"'", "amount": '"$AMOUNT3"'}
      ]
    },
    "id": 100
  }')

echo "$TX_RESULT" | tee -a "$LOG_FILE"

# Extract transaction hash
TX_HASH=$(echo "$TX_RESULT" | jq -r '.result.transactionHash // empty')

if [[ -z "$TX_HASH" ]]; then
    error "Failed to create transaction"
    echo "$TX_RESULT" | jq '.'
    exit 1
fi

success "Transaction created: $TX_HASH"

# Wait for transaction to settle
log "Waiting for transaction to settle (5 seconds)..."
sleep 5

# Step 5: Verify transaction
log "Verifying transaction..."

TX_QUERY=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"query\",\"params\":{\"url\":\"$TX_HASH\"},\"id\":1}")

echo "$TX_QUERY" | jq '.' | tee -a "$LOG_FILE"

# Verify recipients received tokens
log "Checking recipient balances..."

for i in 1 2 3; do
    RECIPIENT_VAR="RECIPIENT$i"
    RECIPIENT_ADDR="${!RECIPIENT_VAR}"

    RECIP_BAL=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json" \
      -d "{\"jsonrpc\":\"2.0\",\"method\":\"query\",\"params\":{\"url\":\"$RECIPIENT_ADDR\"},\"id\":1}" | \
      jq -r '.result.data.balance // "0"')

    success "Recipient $i balance: $(echo "scale=2; $RECIP_BAL / 100000000" | bc) ACME"
done

# Step 6: Generate explorer test instructions
echo ""
echo "═════════════════════════════════════════════════════════════"
echo "  EXPLORER TEST - Manual Verification Required"
echo "═════════════════════════════════════════════════════════════"
echo ""
echo "Transaction Hash: $TX_HASH"
echo ""
echo "To test the BigInt fix in the explorer:"
echo ""
echo "1. Start the explorer in dev mode:"
echo "   cd $EXPLORER_DIR"
echo "   export REACT_APP_ACCUMULATE_API_URL=$API_URL"
echo "   npm start"
echo ""
echo "2. Navigate to transaction:"
echo "   http://localhost:3000/tx/$TX_HASH"
echo ""
echo "3. Verify:"
echo "   ✓ Transaction displays without errors"
echo "   ✓ No 'Cannot mix BigInt' error in console (F12)"
echo "   ✓ Amount field shows total: 71.50 ACME"
echo "   ✓ Individual outputs show correct amounts:"
echo "     - Recipient 1: 25.50 ACME"
echo "     - Recipient 2: 30.75 ACME"
echo "     - Recipient 3: 15.25 ACME"
echo "   ✓ Formatted amount (2 decimals) displays correctly"
echo ""
echo "4. Check browser console (F12 → Console):"
echo "   Should see NO TypeError messages"
echo ""
echo "═════════════════════════════════════════════════════════════"
echo ""

# Save test data for later reference
TEST_DATA_FILE="/tmp/bigint-test-data.json"
cat > "$TEST_DATA_FILE" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "transaction_hash": "$TX_HASH",
  "sender": "$SENDER",
  "recipients": [
    {"address": "$RECIPIENT1", "amount": "$AMOUNT1", "amount_acme": "25.50"},
    {"address": "$RECIPIENT2", "amount": "$AMOUNT2", "amount_acme": "30.75"},
    {"address": "$RECIPIENT3", "amount": "$AMOUNT3", "amount_acme": "15.25"}
  ],
  "total_amount": "$TOTAL_EXPECTED",
  "total_acme": "71.50",
  "api_url": "$API_URL",
  "explorer_url": "http://localhost:3000/tx/$TX_HASH",
  "log_file": "$LOG_FILE"
}
EOF

success "Test data saved to: $TEST_DATA_FILE"
success "Test log saved to: $LOG_FILE"

echo ""
log "Automated testing complete!"
log "Proceed with manual explorer verification using the instructions above."
echo ""
