package main

//
// BigInt Transaction Test Generator
//
// Purpose: Create multi-output transactions to test the SendTokens.tsx BigInt fix
//
// This program:
// 1. Creates lite ACME accounts
// 2. Funds sender via faucet
// 3. Sends tokens to multiple recipients (triggers reduce() code path)
// 4. Outputs transaction hash for explorer testing
//

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"fmt"
	"math/big"
	"time"

	client "gitlab.com/accumulatenetwork/accumulate/pkg/client/api/v2"
	"gitlab.com/accumulatenetwork/accumulate/pkg/client/signing"
	"gitlab.com/accumulatenetwork/accumulate/protocol"
)

const (
	API_URL = "http://127.0.0.1:26660/v2"
)

func main() {
	ctx := context.Background()

	fmt.Println("═══════════════════════════════════════════════════════")
	fmt.Println("  BigInt Transaction Test Generator")
	fmt.Println("═══════════════════════════════════════════════════════")
	fmt.Println()

	// Create API client
	c, err := client.New(API_URL)
	if err != nil {
		panic(fmt.Sprintf("Failed to create client: %v", err))
	}

	// Step 1: Create accounts
	fmt.Println("Step 1: Creating lite ACME accounts...")

	pubSender, privSender, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		panic(err)
	}

	sender, err := protocol.LiteTokenAddress(pubSender, protocol.ACME, protocol.SignatureTypeRCD1)
	if err != nil {
		panic(err)
	}

	// Create 3 recipient accounts
	recipients := make([]*protocol.URL, 3)
	for i := 0; i < 3; i++ {
		pub, _, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			panic(err)
		}
		recipients[i], err = protocol.LiteTokenAddress(pub, protocol.ACME, protocol.SignatureTypeRCD1)
		if err != nil {
			panic(err)
		}
	}

	fmt.Printf("  Sender:     %s\n", sender)
	fmt.Printf("  Recipient1: %s\n", recipients[0])
	fmt.Printf("  Recipient2: %s\n", recipients[1])
	fmt.Printf("  Recipient3: %s\n", recipients[2])
	fmt.Println()

	// Step 2: Fund sender
	fmt.Println("Step 2: Funding sender via faucet...")

	faucetReq := &protocol.AcmeFaucet{Url: sender}
	for i := 0; i < 10; i++ {
		_, err = c.Faucet(ctx, faucetReq)
		if err != nil {
			panic(fmt.Sprintf("Faucet call %d failed: %v", i+1, err))
		}
		fmt.Printf("  Faucet call %d/10\n", i+1)
		time.Sleep(200 * time.Millisecond)
	}

	fmt.Println("  Waiting for balance to settle...")
	time.Sleep(5 * time.Second)

	// Check balance
	balResp, err := c.QueryAccount(ctx, sender, nil)
	if err != nil {
		panic(err)
	}

	acc := balResp.Account.(*protocol.LiteTokenAccount)
	balance := acc.Balance
	fmt.Printf("  Sender balance: %s ACME\n", formatACME(balance))
	fmt.Println()

	// Step 3: Create multi-output transaction
	fmt.Println("Step 3: Creating multi-output transaction...")
	fmt.Println("  This triggers the reduce() code path in SendTokens.tsx")
	fmt.Println()

	// Amounts (nanoACME)
	amount1 := big.NewInt(25_50000000) // 25.50 ACME
	amount2 := big.NewInt(30_75000000) // 30.75 ACME
	amount3 := big.NewInt(15_25000000) // 15.25 ACME

	fmt.Printf("  → %s: %s ACME\n", recipients[0].ShortString(), formatACME(amount1))
	fmt.Printf("  → %s: %s ACME\n", recipients[1].ShortString(), formatACME(amount2))
	fmt.Printf("  → %s: %s ACME\n", recipients[2].ShortString(), formatACME(amount3))

	total := new(big.Int).Add(amount1, new(big.Int).Add(amount2, amount3))
	fmt.Printf("  Total: %s ACME\n", formatACME(total))
	fmt.Println()

	// Build transaction
	txn := &protocol.SendTokens{
		To: []*protocol.TokenRecipient{
			{Url: recipients[0], Amount: *amount1},
			{Url: recipients[1], Amount: *amount2},
			{Url: recipients[2], Amount: *amount3},
		},
	}

	// Sign and submit
	builder := signing.NewBuilder(signing.NetworkTypeLocalDevnet)
	builder.SetTimestampToNow()
	builder.AddSigner(sender, privSender)

	builder.Initiate(txn)

	env, err := builder.Done()
	if err != nil {
		panic(fmt.Sprintf("Failed to build transaction: %v", err))
	}

	fmt.Println("  Submitting transaction...")
	submitResp, err := c.Submit(ctx, env[0], nil)
	if err != nil {
		panic(fmt.Sprintf("Failed to submit transaction: %v", err))
	}

	txHash := submitResp.Hash()
	fmt.Printf("  ✓ Transaction submitted: %s\n", txHash)
	fmt.Println()

	// Wait for transaction to be processed
	fmt.Println("  Waiting for transaction to settle...")
	time.Sleep(5 * time.Second)

	// Output test instructions
	fmt.Println("═══════════════════════════════════════════════════════")
	fmt.Println("  EXPLORER TEST INSTRUCTIONS")
	fmt.Println("═══════════════════════════════════════════════════════")
	fmt.Println()
	fmt.Printf("Transaction Hash: %s\n", txHash)
	fmt.Println()
	fmt.Println("To test the BigInt fix:")
	fmt.Println()
	fmt.Println("1. Start explorer:")
	fmt.Println("   cd /home/paul/go/src/gitlab.com/AccumulateNetwork/explorer")
	fmt.Println("   export REACT_APP_ACCUMULATE_API_URL=" + API_URL)
	fmt.Println("   npm start")
	fmt.Println()
	fmt.Printf("2. Navigate to: http://localhost:3000/tx/%s\n", txHash)
	fmt.Println()
	fmt.Println("3. Verify:")
	fmt.Println("   ✓ Transaction displays without errors")
	fmt.Println("   ✓ No 'Cannot mix BigInt' error in console")
	fmt.Println("   ✓ Amount field shows: 71.50 ACME")
	fmt.Println("   ✓ Individual outputs show correct amounts")
	fmt.Println()
	fmt.Println("4. Open browser console (F12) and verify no TypeErrors")
	fmt.Println()
	fmt.Println("═══════════════════════════════════════════════════════")
	fmt.Println()

	// Save test data
	fmt.Printf("Sender: %s\n", sender)
	fmt.Printf("Recipients: %s, %s, %s\n", recipients[0], recipients[1], recipients[2])
	fmt.Printf("TX Hash: %s\n", txHash)
	fmt.Println()
	fmt.Println("Test complete! Proceed with manual explorer verification.")
}

func formatACME(amount *big.Int) string {
	// Convert nanoACME to ACME (divide by 10^8)
	acme := new(big.Float).SetInt(amount)
	acme.Quo(acme, big.NewFloat(1e8))
	return acme.Text('f', 8)
}
