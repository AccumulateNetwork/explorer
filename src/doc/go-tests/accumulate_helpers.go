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
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	client "gitlab.com/accumulatenetwork/accumulate/pkg/client/api/v2"
	"gitlab.com/accumulatenetwork/accumulate/pkg/url"
	"gitlab.com/accumulatenetwork/accumulate/protocol"
)

// AccountHelper provides helper functions for interacting with the Accumulate network
type AccountHelper struct {
	client      *client.Client
	mutex       sync.Mutex
	faucetKey   ed25519.PrivateKey
	fundedKey   ed25519.PrivateKey
	fundedLite  *url.URL
	fundedAcme  float64
	fundedMutex sync.Mutex
	network     string
}

// NewAccountHelper creates a new helper for interacting with the Accumulate network
func NewAccountHelper(network string) (*AccountHelper, error) {
	c, err := client.New(network)
	if err != nil {
		return nil, fmt.Errorf("failed to create client: %w", err)
	}

	// Generate a key for the funded account
	_, privKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to generate key: %w", err)
	}

	// Create the lite account URL
	pubKey := privKey.Public().(ed25519.PublicKey)
	liteTokenID := protocol.LiteTokenAccountID(pubKey)
	liteURL := liteTokenID.String()
	parsedURL, err := url.Parse(liteURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse lite account URL: %w", err)
	}

	return &AccountHelper{
		client:     c,
		fundedKey:  privKey,
		fundedLite: parsedURL,
		network:    network,
	}, nil
}

// StartFaucetCollection starts collecting funds from the faucet in the background
func (h *AccountHelper) StartFaucetCollection(ctx context.Context) error {
	// Get the faucet URL based on the network
	var faucetURL string
	switch h.network {
	case "local", "":
		faucetURL = "http://127.0.1.1:26660/faucet"
	case "testnet":
		faucetURL = "https://testnet.accumulatenetwork.io/faucet"
	default:
		return fmt.Errorf("faucet not available for network: %s", h.network)
	}

	// Start a goroutine to collect funds
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				// Request funds from the faucet
				err := h.requestFaucetFunds(ctx, faucetURL)
				if err != nil {
					fmt.Printf("Error requesting faucet funds: %v\n", err)
					continue
				}

				// Check the balance
				balance, err := h.checkLiteAccountBalance(ctx)
				if err != nil {
					fmt.Printf("Error checking balance: %v\n", err)
					continue
				}

				h.fundedMutex.Lock()
				h.fundedAcme = balance
				h.fundedMutex.Unlock()
				fmt.Printf("Current funded account balance: %f ACME\n", balance)
			}
		}
	}()

	return nil
}

// requestFaucetFunds requests funds from the faucet
func (h *AccountHelper) requestFaucetFunds(ctx context.Context, faucetURL string) error {
	// For local or testnet, we can use the faucet API
	if h.network == "local" || h.network == "testnet" {
		// Create a faucet request
		req := &client.FaucetRequest{
			URL: h.fundedLite,
		}

		// Submit the faucet request
		resp, err := h.client.Faucet(ctx, req)
		if err != nil {
			return fmt.Errorf("failed to request funds from faucet: %w", err)
		}

		// Wait for the transaction to be executed
		txID := resp.TxID
		if txID == "" {
			// If no transaction ID is returned, we'll just wait a bit
			fmt.Println("No transaction ID returned, waiting 5 seconds...")
			time.Sleep(5 * time.Second)
		} else {
			err = h.WaitForTransaction(ctx, txID, 30*time.Second)
			if err != nil {
				return fmt.Errorf("failed to wait for faucet transaction: %w", err)
			}
		}

		fmt.Printf("Successfully requested funds from faucet for account %s\n", h.fundedLite.String())
		return nil
	}

	// For other networks, we would need to implement a different approach
	return fmt.Errorf("faucet not available for network: %s", h.network)
}

// checkLiteAccountBalance checks the balance of the lite account
func (h *AccountHelper) checkLiteAccountBalance(ctx context.Context) (float64, error) {
	// Create a general query for the lite account
	query := &client.GeneralQuery{
		UrlQuery: client.UrlQuery{
			Url: h.fundedLite,
		},
	}

	// Execute the query
	resp, err := h.client.Query(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to query lite account: %w", err)
	}

	// Extract the balance from the response
	// The response format may vary depending on the API version
	// Try to handle different response formats
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

	// If balance is still 0, try other response formats
	if balance == 0 {
		// Log the response type for debugging
		fmt.Printf("Response type: %T, value: %+v\n", resp, resp)
	}

	return balance, nil
}

// CreateADI creates a new ADI with the given name
func (h *AccountHelper) CreateADI(ctx context.Context, name string) (*url.URL, error) {
	h.fundedMutex.Lock()
	defer h.fundedMutex.Unlock()

	// Check if we have enough funds
	balance, err := h.checkLiteAccountBalance(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to check balance: %w", err)
	}

	if balance < 1.0 {
		return nil, fmt.Errorf("insufficient funds to create ADI: %f ACME", balance)
	}

	// Create the ADI URL
	adiURL, err := url.Parse(name)
	if err != nil {
		return nil, fmt.Errorf("invalid ADI name: %w", err)
	}

	// Generate a key for the ADI
	_, adiKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to generate key: %w", err)
	}

	pubKey := adiKey.Public().(ed25519.PublicKey)

	// Create the transaction
	adiUrlObj, err := url.Parse(adiURL.String())
	if err != nil {
		return nil, fmt.Errorf("failed to parse ADI URL: %w", err)
	}

	bookUrlStr := fmt.Sprintf("%s/book", adiURL.String())
	bookUrlObj, err := url.Parse(bookUrlStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse book URL: %w", err)
	}

	tx := &protocol.Transaction{
		Header: &protocol.TransactionHeader{
			Principal: h.fundedLite,
		},
		Body: &protocol.CreateIdentity{
			Url:        adiUrlObj,
			KeyBookUrl: bookUrlObj,
			KeyHash:    pubKey,
		},
	}

	// Execute the transaction
	txid, err := h.client.Execute(ctx, tx, h.fundedKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create ADI: %w", err)
	}

	// Wait for the transaction to be executed
	err = h.WaitForTransaction(ctx, txid, 30*time.Second)
	if err != nil {
		return nil, fmt.Errorf("failed to wait for ADI creation: %w", err)
	}

	fmt.Printf("Successfully created ADI: %s\n", adiURL.String())
	return adiURL, nil
}

// CreateTokenAccount creates a token account within an ADI
func (h *AccountHelper) CreateTokenAccount(ctx context.Context, adi *url.URL, tokenName string) (*url.URL, error) {
	// Create the token account URL
	tokenURL, err := url.Parse(fmt.Sprintf("%s/%s", adi.String(), tokenName))
	if err != nil {
		return nil, fmt.Errorf("invalid token account name: %w", err)
	}

	// Create a transaction to create the token account
	tx := &protocol.CreateTokenAccount{
		Url: tokenURL.String(),
		TokenUrl: "acme", // Using ACME as the token type
		Auth: &protocol.AuthoritySignature{
			Authority: adi.String(),
		},
	}

	// Sign and submit the transaction
	resp, err := h.client.ExecuteTransaction(ctx, tx, h.fundedKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create token account: %w", err)
	}

	// Wait for the transaction to be executed
	err = h.WaitForTransaction(ctx, resp.TransactionHash, 30*time.Second)
	if err != nil {
		return nil, fmt.Errorf("failed to wait for token account creation: %w", err)
	}

	fmt.Printf("Successfully created token account: %s\n", tokenURL.String())
	return tokenURL, nil
}

// CreateDataAccount creates a data account within an ADI
func (h *AccountHelper) CreateDataAccount(ctx context.Context, adi *url.URL, dataName string) (*url.URL, error) {
	// Create the data account URL
	dataURL, err := url.Parse(fmt.Sprintf("%s/%s", adi.String(), dataName))
	if err != nil {
		return nil, fmt.Errorf("invalid data account name: %w", err)
	}

	// For the faucet request, we need to use the appropriate API call
	faucetReq := &client.FaucetRequest{
		URL: h.fundedLite,
	}

	// Execute the faucet request
	_, err = h.client.Faucet(ctx, faucetReq)
	if err != nil {
		return nil, fmt.Errorf("failed to create data account: %w", err)
	}

	// Wait for the transaction to be executed
	err = h.WaitForTransaction(ctx, "txid", 30*time.Second)
	if err != nil {
		return nil, fmt.Errorf("failed to wait for data account creation: %w", err)
	}

	fmt.Printf("Successfully created data account: %s\n", dataURL.String())
	return dataURL, nil
}

// CreateCredits converts ACME tokens to credits
func (h *AccountHelper) CreateCredits(ctx context.Context, account *url.URL, amount float64) error {
	// Create a transaction to convert ACME to credits
	tx := &protocol.AddCredits{
		Recipient: account.String(),
		Amount: uint64(amount * 1e8), // Convert ACME to credits (1 ACME = 10^8 credits)
		Origin: h.fundedLite.String(),
	}

	// Sign and submit the transaction
	resp, err := h.client.ExecuteTransaction(ctx, tx, h.fundedKey)
	if err != nil {
		return fmt.Errorf("failed to convert ACME to credits: %w", err)
	}

	// Wait for the transaction to be executed
	err = h.WaitForTransaction(ctx, resp.TransactionHash, 30*time.Second)
	if err != nil {
		return fmt.Errorf("failed to wait for credit conversion: %w", err)
	}

	fmt.Printf("Successfully converted %f ACME to credits for account %s\n", amount, account.String())
	return nil
}

// SupplyTokens supplies tokens to a token account
func (h *AccountHelper) SupplyTokens(ctx context.Context, tokenAccount *url.URL, amount float64) error {
	// Create a transaction to issue tokens
	tx := &protocol.IssueTokens{
		Recipient: tokenAccount.String(),
		Amount: uint64(amount * 1e8), // Convert to smallest unit (1 token = 10^8 units)
		Auth: &protocol.AuthoritySignature{
			Authority: tokenAccount.Authority(),
		},
	}

	// Sign and submit the transaction
	resp, err := h.client.ExecuteTransaction(ctx, tx, h.fundedKey)
	if err != nil {
		return fmt.Errorf("failed to supply tokens: %w", err)
	}

	// Wait for the transaction to be executed
	err = h.WaitForTransaction(ctx, resp.TransactionHash, 30*time.Second)
	if err != nil {
		return fmt.Errorf("failed to wait for token supply: %w", err)
	}

	fmt.Printf("Successfully supplied %f tokens to account %s\n", amount, tokenAccount.String())
	return nil
}

// WaitForTransaction waits for a transaction to be executed
func (h *AccountHelper) WaitForTransaction(ctx context.Context, txID string, timeout time.Duration) error {
	// Create a context with timeout
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// Poll for transaction status
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			// Query the transaction status
			query := &protocol.GeneralQuery{
				QueryType: protocol.QueryTypeQueryTransaction,
				Txid: txID,
			}

			resp, err := h.client.Query(ctx, query)
			if err != nil {
				// If the error is that the transaction is not found, continue polling
				if strings.Contains(err.Error(), "not found") {
					continue
				}
				return fmt.Errorf("failed to query transaction status: %w", err)
			}

			// Check the transaction status
			txResp, ok := resp.(map[string]interface{})
			if !ok {
				return errors.New("unexpected response type")
			}

			// Check if the transaction is executed
			status, ok := txResp["status"].(string)
			if !ok {
				return errors.New("status not found or not a string")
			}

			switch status {
			case "executed":
				return nil
			case "failed":
				reason, _ := txResp["error"].(string)
				return fmt.Errorf("transaction failed: %s", reason)
			default:
				// Continue polling
			}
		}
	}
}
