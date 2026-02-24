package main

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/syndtr/goleveldb/leveldb"
)

var (
	// Genesis reset on July 14, 2025 - post-genesis block 1 started at this time
	// Major blocks occur every 12 hours (cron: "0 */12 * * *")
	genesisResetTime = time.Date(2025, 7, 14, 0, 0, 0, 0, time.UTC)
	majorBlockInterval = 12 * time.Hour
	// Pre-genesis offset: the old chain had 1,864 major blocks before the reset
	// Absolute block number = post-genesis block + 1864
	preGenesisBlockOffset int64 = 1864
)

// SupplyMetrics represents the supply data for ACME token
type SupplyMetrics struct {
	Max              int64 `json:"max"`
	Total            int64 `json:"total"`
	Circulating      int64 `json:"circulating"`
	CirculatingTokens int64 `json:"circulatingTokens"` // Alias for compatibility with Explorer
	Staked           int64 `json:"staked"`
}

// TimestampData represents cached timestamp information
type TimestampData struct {
	Chains          []ChainEntry `json:"chains"`
	Status          string       `json:"status,omitempty"`   // Transaction status: pending, delivered, etc.
	MinorBlock      int64        `json:"minorBlock,omitempty"` // Minor block index (0 if pending)
	MajorBlock      int64        `json:"majorBlock,omitempty"` // Major block index (0 if pending)
	// Internal cache fields (prefixed with underscore to hide from API consumers)
	HasBlockTime    bool         `json:"_hasBlockTime,omitempty"` // If true, from block (never re-query). If false, from signature (keep checking for block)
	SignatureTime   int64        `json:"_signatureTime,omitempty"` // Oldest signature timestamp (cached permanently)
}

type ChainEntry struct {
	Chain string `json:"chain"`
	Block int64  `json:"block"`
	Time  string `json:"time"`
}

// V3QueryResponse represents the v3 API response for a transaction
type V3QueryResponse struct {
	Result struct {
		Status     string `json:"status"`
		Signatures struct {
			Records []V3SignatureSet `json:"records"`
		} `json:"signatures"`
	} `json:"result"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

type V3SignatureSet struct {
	Signatures struct {
		Records []V3SignatureRecord `json:"records"`
	} `json:"signatures"`
}

type V3SignatureRecord struct {
	Message struct {
		Signature V3Signature `json:"signature"`
	} `json:"message"`
}

type V3Signature struct {
	Type      string          `json:"type"`
	Signature json.RawMessage `json:"signature,omitempty"` // Can be nested object or string
	Timestamp int64           `json:"timestamp,omitempty"`
}

var (
	// Cache for supply metrics (in-memory, short-lived)
	cachedMetrics *SupplyMetrics
	lastUpdate    time.Time
	cacheDuration = 5 * time.Minute

	// Timestamp database (persistent LevelDB, never expires)
	timestampDB *leveldb.DB

	// Accumulate API endpoints
	accumulateAPI   = "https://mainnet.accumulatenetwork.io/v3"
	accumulateAPIv2 = "https://mainnet.accumulatenetwork.io"

	// REMOVED: Hard-coded accounts optimization - must query all entries to handle account removal
	// Previously hard-coded 15 accounts (up to index 418), but accounts can be deleted (Status == "deleted")
	// Must dynamically build complete account set by querying all chain entries every time
	// knownStakingAccounts = []string{...}
	// lastKnownChainIndex = int64(418)
)

// RegistrationIdentity represents a complete registration entry
// Supports both modern (multi-account) and legacy (single-account) formats
type RegistrationIdentity struct {
	// Modern format (multi-account)
	Identity        string    `json:"identity"`
	Accounts        []Account `json:"accounts"`
	DelegatorPayout string    `json:"delegatorPayout"`
	RejectDelegates bool      `json:"rejectDelegates"`
	Status          string    `json:"status"`

	// Legacy format (single account) - backward compatibility
	Type     string `json:"type"`
	Stake    string `json:"stake"`
	Rewards  string `json:"rewards"`
	Delegate string `json:"delegate"`
	Lockup   uint64 `json:"lockup"`
	HardLock bool   `json:"hardLock"`

	// Additional fields
	AcceptingDelegates string `json:"acceptingDelegates"`
}

// Account represents a staking account in the modern format
type Account struct {
	Type     string `json:"type"`     // "pure", "delegated", "coreValidator", etc.
	Url      string `json:"url"`      // Primary staking account URL
	Payout   string `json:"payout"`   // Reward payout account
	Delegate string `json:"delegate"` // Delegation target
	Lockup   uint64 `json:"lockup"`   // Lockup quarters
	HardLock bool   `json:"hardLock"` // Hard lock flag
}

// normalizeIdentity converts legacy format to modern format
// Matches staking/pkg/types/account.go Normalize() behavior
func normalizeIdentity(id *RegistrationIdentity) {
	// If Stake is empty, nothing to normalize
	if id.Stake == "" {
		return
	}

	// Check if account already exists matching Stake URL
	for _, a := range id.Accounts {
		if a.Url == id.Stake {
			// Already normalized
			id.clearLegacyFields()
			return
		}
	}

	// Convert legacy fields to Account entry
	account := Account{
		Type:     id.Type,
		Url:      id.Stake,
		Payout:   id.Rewards,
		Delegate: id.Delegate,
		Lockup:   id.Lockup,
		HardLock: id.HardLock,
	}
	id.Accounts = append(id.Accounts, account)

	// Set DelegatorPayout if not explicitly configured
	if !id.RejectDelegates && id.DelegatorPayout == "" {
		if id.Rewards != "" {
			id.DelegatorPayout = id.Rewards
		} else {
			id.DelegatorPayout = id.Stake
		}
	}

	id.clearLegacyFields()
}

func (id *RegistrationIdentity) clearLegacyFields() {
	id.Stake = ""
	id.Rewards = ""
	id.Type = ""
	id.Delegate = ""
	id.Lockup = 0
	id.HardLock = false
}

// AccumulateResponse represents the JSON-RPC response from Accumulate v3 API
type AccumulateResponse struct {
	Result struct {
		Account struct {
			Type        string `json:"type"`
			URL         string `json:"url"`
			Symbol      string `json:"symbol"`
			Precision   int    `json:"precision"`
			Issued      string `json:"issued"`
			SupplyLimit string `json:"supplyLimit"`
		} `json:"account"`
	} `json:"result"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func main() {
	// Open LevelDB for timestamp cache
	var err error
	timestampDB, err = leveldb.OpenFile("./data/timestamps.db", nil)
	if err != nil {
		log.Fatalf("Failed to open timestamp database: %v", err)
	}
	defer timestampDB.Close()

	router := mux.NewRouter()

	// API routes
	router.HandleFunc("/v1/supply", getSupplyHandler).Methods("GET", "OPTIONS")
	router.HandleFunc("/v1/timestamp/{txid}", getTimestampHandler).Methods("GET", "OPTIONS")
	router.HandleFunc("/health", healthHandler).Methods("GET")

	// Start server
	port := ":8080"
	log.Printf("Starting Accumulate Metrics API on %s", port)
	log.Fatal(http.ListenAndServe(port, router))
}

// Health check endpoint
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"time":   time.Now().Format(time.RFC3339),
	})
}

// Get supply metrics handler
func getSupplyHandler(w http.ResponseWriter, r *http.Request) {
	// Check cache
	if cachedMetrics != nil && time.Since(lastUpdate) < cacheDuration {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		json.NewEncoder(w).Encode(cachedMetrics)
		return
	}

	// Fetch fresh metrics
	metrics, err := fetchSupplyMetrics()
	if err != nil {
		// If fetch fails but we have cached data, return cached
		if cachedMetrics != nil {
			log.Printf("Error fetching metrics, using cached data: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "STALE")
			json.NewEncoder(w).Encode(cachedMetrics)
			return
		}

		log.Printf("Error fetching metrics: %v", err)
		http.Error(w, "Failed to fetch metrics", http.StatusInternalServerError)
		return
	}

	// Update cache
	cachedMetrics = metrics
	lastUpdate = time.Now()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cache", "MISS")
	json.NewEncoder(w).Encode(metrics)
}

// queryStakedAmount queries the actual staked ACME from registered staking accounts
// Matches staking tool's LoadAllRegistered logic:
// 1. Build identity map from all chain entries (latest status per identity)
// 2. Skip deleted identities
// 3. Extract accounts from registered identities only
// 4. Query balances and sum
func queryStakedAmount() (int64, error) {
	// Step 1: Get the total number of entries in the main chain
	chainReq := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      0,
		"method":  "query",
		"params": map[string]interface{}{
			"scope": "acc://staking.acme/registered",
			"query": map[string]interface{}{
				"queryType": "chain",
			},
		},
	}

	jsonData, err := json.Marshal(chainReq)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal chain request: %w", err)
	}

	resp, err := http.Post(accumulateAPI, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return 0, fmt.Errorf("failed to query chain: %w", err)
	}
	defer resp.Body.Close()

	var chainResp struct {
		Result struct {
			Records []struct {
				Name  string `json:"name"`
				Count int64  `json:"count"`
			} `json:"records"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&chainResp); err != nil {
		return 0, fmt.Errorf("failed to decode chain response: %w", err)
	}

	// Find the main chain and get total count
	var totalEntries int64
	for _, chain := range chainResp.Result.Records {
		if chain.Name == "main" {
			totalEntries = chain.Count
			break
		}
	}

	if totalEntries == 0 {
		return 0, fmt.Errorf("no entries found in main chain")
	}

	log.Printf("Querying %d chain entries from acc://staking.acme/registered", totalEntries)

	// Step 2: Build identity map - query all chain entries
	// Map to track latest registration per identity (key = identity URL)
	identityMap := make(map[string]*RegistrationIdentity)
	batchSize := int64(100)

	for start := int64(0); start < totalEntries; start += batchSize {
		count := batchSize
		if start+count > totalEntries {
			count = totalEntries - start
		}

		// Query a range of chain entries
		rangeReq := map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      int(start),
			"method":  "query",
			"params": map[string]interface{}{
				"scope": "acc://staking.acme/registered",
				"query": map[string]interface{}{
					"queryType":      "chain",
					"name":           "main",
					"range":          map[string]interface{}{"start": start, "count": count},
					"includeReceipt": false,
				},
			},
		}

		jsonData, err := json.Marshal(rangeReq)
		if err != nil {
			log.Printf("Warning: Failed to marshal range request for entries %d-%d: %v", start, start+count-1, err)
			continue
		}

		resp, err := http.Post(accumulateAPI, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("Warning: Failed to fetch entries %d-%d: %v", start, start+count-1, err)
			continue
		}
		defer resp.Body.Close()

		var rangeResp struct {
			Result struct {
				Records []struct {
					Entry string `json:"entry"`
					Index int64  `json:"index"`
				} `json:"records"`
			} `json:"result"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&rangeResp); err != nil {
			log.Printf("Warning: Failed to decode response for entries %d-%d: %v", start, start+count-1, err)
			continue
		}

		// Process each entry hash - query the full transaction
		for _, record := range rangeResp.Result.Records {
			// Query the transaction by its entry hash
			txReq := map[string]interface{}{
				"jsonrpc": "2.0",
				"id":      int(record.Index),
				"method":  "query",
				"params": map[string]interface{}{
					"scope": fmt.Sprintf("acc://%s@staking.acme/registered", record.Entry),
					"query": map[string]interface{}{},
				},
			}

			txData, err := json.Marshal(txReq)
			if err != nil {
				continue
			}

			txResp, err := http.Post(accumulateAPI, "application/json", bytes.NewBuffer(txData))
			if err != nil {
				continue
			}
			defer txResp.Body.Close()

			var txResult struct {
				Result struct {
					Message struct {
						Transaction struct {
							Body struct {
								Type  string `json:"type"`
								Entry struct {
									Data []string `json:"data"`
								} `json:"entry"`
							} `json:"body"`
						} `json:"transaction"`
					} `json:"message"`
				} `json:"result"`
			}

			if err := json.NewDecoder(txResp.Body).Decode(&txResult); err != nil {
				continue
			}

			// Check if this is a WriteData transaction
			if txResult.Result.Message.Transaction.Body.Type == "writeData" {
				dataArray := txResult.Result.Message.Transaction.Body.Entry.Data
				if len(dataArray) > 0 {
					// Decode hex to JSON
					dataBytes, err := hex.DecodeString(dataArray[0])
					if err != nil {
						continue
					}

					var entryData RegistrationIdentity
					if err := json.Unmarshal(dataBytes, &entryData); err != nil {
						continue
					}

					// Normalize legacy format to modern format
					normalizeIdentity(&entryData)

					// Infer identity from Stake if missing (legacy format)
					identity := entryData.Identity
					if identity == "" && entryData.Stake != "" {
						// Extract identity from stake URL: "acc://validator.acme/staking" -> "acc://validator.acme"
						parts := strings.Split(entryData.Stake, "/")
						if len(parts) >= 3 {
							identity = strings.Join(parts[:3], "/")
						}
					}

					if identity == "" {
						continue
					}

					// Keep latest entry per identity (entries processed forward, later entries overwrite)
					identityMap[identity] = &entryData
				}
			}
		}
	}

	// Step 3: Extract accounts from registered identities only
	var stakingAccounts []string
	registeredCount := 0
	deletedCount := 0
	missingStatusCount := 0
	identitiesWithoutAccounts := 0

	for identity, entryData := range identityMap {
		// Skip deleted entries
		if entryData.Status == "deleted" {
			deletedCount++
			continue
		}

		// Include registered identities OR entries with missing status (legacy format)
		// Legacy entries don't have explicit status but are implicitly registered
		if entryData.Status == "registered" || entryData.Status == "" {
			if entryData.Status == "" {
				missingStatusCount++
			}
			registeredCount++
			accountCountBefore := len(stakingAccounts)
			for _, account := range entryData.Accounts {
				if account.Url != "" {
					stakingAccounts = append(stakingAccounts, account.Url)
				}
			}
			// Check if this identity has no accounts
			if len(stakingAccounts) == accountCountBefore {
				identitiesWithoutAccounts++
				log.Printf("Warning: Identity has no accounts: %s (status: %q)", identity, entryData.Status)
			}
		} else {
			log.Printf("Warning: Unknown status '%s' for identity: %s", entryData.Status, identity)
		}
	}

	log.Printf("Found %d identities: %d registered (%d legacy without status, %d without accounts), %d deleted, extracted %d staking accounts",
		len(identityMap), registeredCount, missingStatusCount, identitiesWithoutAccounts, deletedCount, len(stakingAccounts))

	// Deduplicate account URLs (accounts can appear in multiple identities)
	uniqueAccounts := make(map[string]bool)
	for _, url := range stakingAccounts {
		uniqueAccounts[url] = true
	}

	log.Printf("Unique staking accounts after deduplication: %d", len(uniqueAccounts))

	// Step 4: Query balance of each unique staking account and sum them up
	var totalStakedRaw int64
	for accountURL := range uniqueAccounts {
		requestBody := map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      0,
			"method":  "query",
			"params": map[string]interface{}{
				"scope": accountURL,
				"query": map[string]interface{}{},
			},
		}

		jsonData, err := json.Marshal(requestBody)
		if err != nil {
			continue
		}

		resp, err := http.Post(accumulateAPI, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		var accResp struct {
			Result struct {
				Account struct {
					Type    string `json:"type"`
					Balance string `json:"balance"`
				} `json:"account"`
			} `json:"result"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&accResp); err != nil {
			continue
		}

		// Parse balance
		if accResp.Result.Account.Balance != "" {
			var balance int64
			if _, err := fmt.Sscanf(accResp.Result.Account.Balance, "%d", &balance); err == nil {
				totalStakedRaw += balance
			}
		}
	}

	// Convert from smallest units to ACME tokens
	const acmePrecision = 100000000 // 10^8
	totalStaked := totalStakedRaw / acmePrecision

	log.Printf("Total staked: %d ACME (from %d unique accounts)", totalStaked, len(uniqueAccounts))

	return totalStaked, nil
}

// Fetch supply metrics from Accumulate mainnet
func fetchSupplyMetrics() (*SupplyMetrics, error) {
	// Query ACME token issuer from Accumulate network using v3 API
	requestBody := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      0,
		"method":  "query",
		"params": map[string]interface{}{
			"scope": "acc://ACME",
			"query": map[string]interface{}{},
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(accumulateAPI, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to query Accumulate API: %w", err)
	}
	defer resp.Body.Close()

	var accResp AccumulateResponse
	if err := json.NewDecoder(resp.Body).Decode(&accResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if accResp.Error != nil {
		return nil, fmt.Errorf("Accumulate API error: %s", accResp.Error.Message)
	}

	// Parse the issued tokens value (as string from API) - this is in smallest units
	var issuedRaw int64
	if _, err := fmt.Sscanf(accResp.Result.Account.Issued, "%d", &issuedRaw); err != nil {
		return nil, fmt.Errorf("failed to parse issued amount: %w", err)
	}

	// Parse the supply limit - this is in smallest units
	var supplyLimitRaw int64
	if _, err := fmt.Sscanf(accResp.Result.Account.SupplyLimit, "%d", &supplyLimitRaw); err != nil {
		return nil, fmt.Errorf("failed to parse supply limit: %w", err)
	}

	// Convert from smallest units to ACME tokens
	// ACME has precision=8, meaning 1 ACME = 10^8 smallest units
	const acmePrecision = 100000000 // 10^8
	issued := issuedRaw / acmePrecision
	supplyLimit := supplyLimitRaw / acmePrecision

	// Query actual staked amount from registered staking accounts
	staked, err := queryStakedAmount()
	if err != nil {
		log.Printf("Error querying staked amount, using estimate: %v", err)
		// Fall back to estimate if query fails
		staked = issued / 5 // ~20% estimate
	}

	// Circulating = issued - staked
	circulating := issued - staked

	metrics := &SupplyMetrics{
		Max:              supplyLimit,
		Total:            issued,
		Circulating:      circulating,
		CirculatingTokens: circulating, // Same as Circulating for compatibility
		Staked:           staked,
	}

	log.Printf("Fetched metrics: Max=%d, Total=%d, Circulating=%d, Staked=%d",
		metrics.Max, metrics.Total, metrics.Circulating, metrics.Staked)

	return metrics, nil
}

// calculateMajorBlock calculates the absolute major block index from a timestamp
// Major blocks occur every 12 hours. The network underwent a genesis reset on July 14, 2025:
// - Pre-genesis: Oct 31, 2022 - Jul 13, 2025 (blocks 1-1864)
// - Post-genesis: Jul 14, 2025+ (blocks 1, 2, 3... which map to absolute blocks 1865, 1866, 1867...)
// Returns the absolute block number (continuous sequence across the genesis reset)
func calculateMajorBlock(t time.Time) int64 {
	if t.Before(genesisResetTime) {
		// Pre-genesis blocks - would need original genesis time to calculate
		// For now, return 0 for timestamps before the reset
		return 0
	}

	// Post-genesis: calculate block since reset, then add offset for absolute number
	duration := t.Sub(genesisResetTime)
	periods := int64(duration / majorBlockInterval)
	postGenesisBlock := 1 + periods
	absoluteBlock := preGenesisBlockOffset + postGenesisBlock
	return absoluteBlock
}

// extractTimestampFromMap recursively extracts timestamp from nested signature map structures
func extractTimestampFromMap(obj interface{}) int64 {
	m, ok := obj.(map[string]interface{})
	if !ok {
		return 0
	}

	// Look for message.signature
	if message, ok := m["message"].(map[string]interface{}); ok {
		if signature, ok := message["signature"].(map[string]interface{}); ok {
			return extractTimestampFromSignature(signature)
		}
	}
	return 0
}

// extractTimestampFromSignature recursively finds timestamp in signature object
func extractTimestampFromSignature(sig map[string]interface{}) int64 {
	// Check if this level has a timestamp
	if ts, ok := sig["timestamp"].(float64); ok {
		return int64(ts)
	}

	// Recursively check nested signature
	if nestedSig, ok := sig["signature"].(map[string]interface{}); ok {
		return extractTimestampFromSignature(nestedSig)
	}

	return 0
}

// Get timestamp handler
func getTimestampHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	txid := vars["txid"]

	// Clean the txid - remove acc:// prefix and @suffix if present
	txid = strings.TrimPrefix(txid, "acc://")
	if idx := strings.Index(txid, "@"); idx >= 0 {
		txid = txid[:idx]
	}

	// Check LevelDB cache first
	var cachedData *TimestampData
	var cacheStatus string
	cachedBytes, err := timestampDB.Get([]byte(txid), nil)
	if err == nil {
		cachedData = &TimestampData{}
		if err := json.Unmarshal(cachedBytes, cachedData); err != nil {
			log.Printf("Error deserializing cached timestamp for %s: %v", txid, err)
			cachedData = nil
		} else if cachedData.HasBlockTime {
			// Have block timestamp - return immediately, never re-query
			response := struct {
				Chains     []ChainEntry `json:"chains"`
				Status     string       `json:"status,omitempty"`
				MinorBlock int64        `json:"minorBlock,omitempty"`
				MajorBlock int64        `json:"majorBlock,omitempty"`
			}{
				Chains:     cachedData.Chains,
				Status:     cachedData.Status,
				MinorBlock: cachedData.MinorBlock,
				MajorBlock: cachedData.MajorBlock,
			}
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT-BLOCK")
			json.NewEncoder(w).Encode(response)
			return
		} else {
			cacheStatus = "HIT-SIG"
		}
	}

	// Either no cache, or have signature timestamp but need to check for block timestamp
	// Query v3 API for transaction status and signatures
	requestBody := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      0,
		"method":  "query",
		"params": map[string]interface{}{
			"scope": fmt.Sprintf("acc://%s@unknown", txid),
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		log.Printf("Error marshaling v3 request for %s: %v", txid, err)
		http.Error(w, "Failed to query transaction", http.StatusInternalServerError)
		return
	}

	resp, err := http.Post(accumulateAPI, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("Error querying v3 API for %s: %v", txid, err)
		// If we have cached signature timestamp, return it
		if cachedData != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", cacheStatus)
			json.NewEncoder(w).Encode(cachedData)
			return
		}
		http.Error(w, "Failed to query transaction", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Decode as generic map to handle varying signature structures
	var v3Resp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&v3Resp); err != nil {
		log.Printf("Error decoding v3 response for %s: %v", txid, err)
		if cachedData != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", cacheStatus)
			json.NewEncoder(w).Encode(cachedData)
			return
		}
		http.Error(w, "Failed to decode response", http.StatusInternalServerError)
		return
	}

	// Check for errors
	if errObj, ok := v3Resp["error"].(map[string]interface{}); ok {
		errMsg := "Unknown error"
		if msg, ok := errObj["message"].(string); ok {
			errMsg = msg
		}
		log.Printf("V3 API error for %s: %s", txid, errMsg)
		if cachedData != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", cacheStatus)
			json.NewEncoder(w).Encode(cachedData)
			return
		}
		http.Error(w, "Transaction not found", http.StatusNotFound)
		return
	}

	// Extract transaction status
	txStatus := ""
	if result, ok := v3Resp["result"].(map[string]interface{}); ok {
		if status, ok := result["status"].(string); ok {
			txStatus = status
		}
	}

	// Try to get block timestamp from v2 timestamp endpoint
	// This endpoint returns chain entries with minor block numbers if the transaction has been executed
	// Note: Major block information is not currently available from this endpoint
	v2Url := fmt.Sprintf("%s/timestamp/%s@unknown", accumulateAPIv2, txid)
	v2Resp, err := http.Get(v2Url)
	hasBlockData := false
	tsData := &TimestampData{
		Status: txStatus,
	}

	if err == nil {
		defer v2Resp.Body.Close()
		var v2Data struct {
			Chains []ChainEntry `json:"chains"`
		}
		if err := json.NewDecoder(v2Resp.Body).Decode(&v2Data); err == nil && len(v2Data.Chains) > 0 {
			// Found chain entries with block data - use this and cache permanently
			tsData.Chains = v2Data.Chains
			// Get the block number from the first chain entry (all should have the same block)
			if len(v2Data.Chains) > 0 && v2Data.Chains[0].Block > 0 {
				tsData.MinorBlock = int64(v2Data.Chains[0].Block)

				// Calculate major block from timestamp
				if blockTime, err := time.Parse(time.RFC3339, v2Data.Chains[0].Time); err == nil {
					tsData.MajorBlock = calculateMajorBlock(blockTime)
				}

				tsData.HasBlockTime = true
				hasBlockData = true
				log.Printf("Found block timestamp for %s: minor=%d, major=%d", txid, tsData.MinorBlock, tsData.MajorBlock)
			}
		}
	}

	// If no block data found, fall back to signature timestamps
	if !hasBlockData {
		oldestTimestamp := int64(0)
		if cachedData != nil {
			oldestTimestamp = cachedData.SignatureTime
		}

		// Extract timestamps from all signatures (recursively for delegated)
		if result, ok := v3Resp["result"].(map[string]interface{}); ok {
			if signatures, ok := result["signatures"].(map[string]interface{}); ok {
				if records, ok := signatures["records"].([]interface{}); ok {
					for _, rec := range records {
						if sigSet, ok := rec.(map[string]interface{}); ok {
							if sigs, ok := sigSet["signatures"].(map[string]interface{}); ok {
								if sigRecs, ok := sigs["records"].([]interface{}); ok {
									for _, sigRec := range sigRecs {
										ts := extractTimestampFromMap(sigRec)
										if ts > 0 && (oldestTimestamp == 0 || ts < oldestTimestamp) {
											oldestTimestamp = ts
										}
									}
								}
							}
						}
					}
				}
			}
		}

		tsData.Chains = []ChainEntry{}
		tsData.MinorBlock = 0
		tsData.MajorBlock = 0
		tsData.HasBlockTime = false
		tsData.SignatureTime = oldestTimestamp

		// If we found a signature timestamp, add it as a chain entry
		if oldestTimestamp > 0 {
			tsData.Chains = []ChainEntry{{
				Chain: "signature",
				Block: 0,
				Time:  time.Unix(0, oldestTimestamp*1000000).Format(time.RFC3339),
			}}
		}
	}

	// Cache the result
	jsonData, err = json.Marshal(tsData)
	if err == nil {
		if err := timestampDB.Put([]byte(txid), jsonData, nil); err != nil {
			log.Printf("Error caching timestamp for %s: %v", txid, err)
		} else {
			if hasBlockData {
				log.Printf("Cached block timestamp for %s: block=%d", txid, tsData.MinorBlock)
			} else {
				log.Printf("Cached signature timestamp for %s: %d", txid, tsData.SignatureTime)
			}
		}
	}

	// Create response without internal fields
	response := struct {
		Chains     []ChainEntry `json:"chains"`
		Status     string       `json:"status,omitempty"`
		MinorBlock int64        `json:"minorBlock,omitempty"`
		MajorBlock int64        `json:"majorBlock,omitempty"`
	}{
		Chains:     tsData.Chains,
		Status:     tsData.Status,
		MinorBlock: tsData.MinorBlock,
		MajorBlock: tsData.MajorBlock,
	}

	w.Header().Set("Content-Type", "application/json")
	if cachedData != nil {
		w.Header().Set("X-Cache", "UPDATE")
	} else {
		w.Header().Set("X-Cache", "MISS")
	}
	json.NewEncoder(w).Encode(response)
}
