// Copyright 2025 The Accumulate Authors
//
// Use of this source code is governed by an MIT-style
// license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

package explorer

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	client "gitlab.com/accumulatenetwork/accumulate/pkg/client/api/v2"
	"gitlab.com/accumulatenetwork/accumulate/pkg/url"
)

// TestFaucetCollection tests the faucet collection functionality
// It measures how long it takes to collect 100 ACME tokens
func TestFaucetCollection(t *testing.T) {
	// Skip this test in CI or if running without network access
	if testing.Short() {
		t.Skip("Skipping faucet test in short mode")
	}

	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// Create a new client for local network
	c, err := client.New("local")
	require.NoError(t, err, "Failed to create client")

	// Generate a key for the lite account
	_, privKey, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err, "Failed to generate key")

	// Create the lite account URL
	pubKey := privKey.Public().(ed25519.PublicKey)
	liteURL := fmt.Sprintf("acc://%s", hex.EncodeToString(pubKey))
	parsedURL, err := url.Parse(liteURL)
	require.NoError(t, err, "Failed to parse lite account URL")

	// Print the lite account URL
	fmt.Printf("\n=== Faucet Collection Test Started ===\n")
	fmt.Printf("Lite account URL: %s\n", liteURL)

	// Get initial balance
	initialBalance := getBalance(t, ctx, c, parsedURL)
	fmt.Printf("Initial balance: %.2f ACME\n", initialBalance)

	// Target amount to collect (100 ACME)
	targetAmount := initialBalance + 100.0
	fmt.Printf("Target balance: %.2f ACME (collecting 100 ACME)\n", targetAmount)

	// Start the faucet collection
	startTime := time.Now()
	fmt.Println("Starting faucet collection...")

	// Poll the balance until we reach the target amount or timeout
	currentBalance := initialBalance
	pollInterval := 5 * time.Second
	requestInterval := 10 * time.Second
	lastRequestTime := time.Now().Add(-requestInterval)

	for currentBalance < targetAmount {
		select {
		case <-ctx.Done():
			t.Fatalf("Context timeout while waiting for faucet collection")
		case <-time.After(pollInterval):
			// Check if it's time to make another faucet request
			if time.Since(lastRequestTime) >= requestInterval {
				// Make a faucet request
				fmt.Println("Requesting funds from faucet...")
				err := requestFaucet(ctx, c, parsedURL)
				if err != nil {
					fmt.Printf("Warning: Failed to request funds: %v\n", err)
				} else {
					fmt.Println("Faucet request submitted successfully")
				}
				lastRequestTime = time.Now()
			}

			// Check the current balance
			currentBalance = getBalance(t, ctx, c, parsedURL)
			amountCollected := currentBalance - initialBalance
			elapsedTime := time.Since(startTime)
			
			fmt.Printf("Current balance: %.2f ACME, Collected: %.2f ACME, Elapsed time: %s\n", 
				currentBalance, amountCollected, elapsedTime)
		}
	}

	// Calculate final results
	elapsedTime := time.Since(startTime)
	amountCollected := currentBalance - initialBalance
	collectionRate := amountCollected / elapsedTime.Seconds() * 60 // ACME per minute

	// Print the final report
	fmt.Printf("\n=== Faucet Collection Report ===\n")
	fmt.Printf("Lite account URL: %s\n", liteURL)
	fmt.Printf("Initial balance: %.2f ACME\n", initialBalance)
	fmt.Printf("Final balance: %.2f ACME\n", currentBalance)
	fmt.Printf("Amount collected: %.2f ACME\n", amountCollected)
	fmt.Printf("Time elapsed: %s\n", elapsedTime)
	fmt.Printf("Collection rate: %.2f ACME per minute\n", collectionRate)
	fmt.Printf("Average time per 10 ACME: %s\n", time.Duration(elapsedTime.Nanoseconds()/int64(amountCollected/10)))
	fmt.Printf("===============================\n")

	// Verify we collected at least the target amount
	require.GreaterOrEqual(t, currentBalance, targetAmount, 
		"Failed to collect the target amount of ACME tokens")
}

// getBalance gets the balance of a lite account
func getBalance(t *testing.T, ctx context.Context, c *client.Client, accountURL *url.URL) float64 {
	// Create a general query for the lite account
	query := &client.GeneralQuery{
		UrlQuery: client.UrlQuery{
			Url: accountURL,
		},
	}

	// Execute the query
	resp, err := c.Query(ctx, query)
	if err != nil {
		t.Logf("Failed to query account: %v", err)
		return 0
	}

	// Try to extract balance from different response formats
	var balance float64

	// Try to extract balance from map response
	if account, ok := resp.(map[string]interface{}); ok {
		if bal, ok := account["balance"].(float64); ok {
			balance = bal
		} else if bal, ok := account["balance"].(string); ok {
			// Try to parse string balance
			fmt.Sscanf(bal, "%f", &balance)
		}
	}

	// If balance is still 0, log the response type for debugging
	if balance == 0 {
		t.Logf("Response type: %T, value: %+v", resp, resp)
	}

	return balance
}

// requestFaucet requests funds from the faucet
func requestFaucet(ctx context.Context, c *client.Client, accountURL *url.URL) error {
	// Create a faucet request using the URL directly
	// The Accumulate API v2 client has a Faucet method that takes a URL
	resp, err := c.Faucet(ctx, &client.FaucetRequest{
		URL: accountURL,
	})
	
	if err != nil {
		return fmt.Errorf("faucet request failed: %w", err)
	}

	// Log the transaction ID if available
	if resp != nil && resp.Txid != "" {
		fmt.Printf("Faucet request submitted with transaction ID: %s\n", resp.Txid)
	}

	return nil
}

// TestFaucetSingleRequest tests a single faucet request
// It verifies that a single call to the faucet returns approximately 10 ACME
func TestFaucetSingleRequest(t *testing.T) {
	// Skip this test in CI or if running without network access
	if testing.Short() {
		t.Skip("Skipping faucet test in short mode")
	}

	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// Create a new client for local network
	c, err := client.New("local")
	require.NoError(t, err, "Failed to create client")

	// Generate a key for the lite account
	_, privKey, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err, "Failed to generate key")

	// Create the lite account URL
	pubKey := privKey.Public().(ed25519.PublicKey)
	liteURL := fmt.Sprintf("acc://%s", hex.EncodeToString(pubKey))
	parsedURL, err := url.Parse(liteURL)
	require.NoError(t, err, "Failed to parse lite account URL")

	// Print the lite account URL
	fmt.Printf("\n=== Single Faucet Request Test Started ===\n")
	fmt.Printf("Lite account URL: %s\n", liteURL)

	// Get initial balance
	initialBalance := getBalance(t, ctx, c, parsedURL)
	fmt.Printf("Initial balance: %.2f ACME\n", initialBalance)

	// Make a single faucet request
	fmt.Println("Making a single faucet request...")
	startTime := time.Now()
	err = requestFaucet(ctx, c, parsedURL)
	require.NoError(t, err, "Failed to request faucet funds")

	// Wait for the transaction to be processed
	fmt.Println("Waiting for transaction to be processed...")
	time.Sleep(10 * time.Second)

	// Check the new balance
	newBalance := getBalance(t, ctx, c, parsedURL)
	
	// Calculate the amount received and elapsed time
	amountReceived := newBalance - initialBalance
	elapsedTime := time.Since(startTime)
	
	// Print the report
	fmt.Printf("\n=== Single Faucet Request Report ===\n")
	fmt.Printf("Lite account URL: %s\n", liteURL)
	fmt.Printf("Initial balance: %.2f ACME\n", initialBalance)
	fmt.Printf("New balance: %.2f ACME\n", newBalance)
	fmt.Printf("Amount received: %.2f ACME\n", amountReceived)
	fmt.Printf("Time elapsed: %s\n", elapsedTime)
	fmt.Printf("===================================\n")
	
	// Verify that we received approximately 10 ACME (with some tolerance)
	// The tolerance is set to 2 ACME to account for potential variations
	expectedAmount := 10.0
	tolerance := 2.0
	
	require.InDelta(t, expectedAmount, amountReceived, tolerance,
		"Single faucet request should return approximately 10 ACME")
}
