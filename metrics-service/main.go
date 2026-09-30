package main

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/syndtr/goleveldb/leveldb"
)

// httpClient is shared by every outbound request. The zero-value
// http.Client used directly (http.Post/http.Get) has no timeout, so one
// hung upstream call could block a request, or the background updater,
// forever (#102).
var httpClient = &http.Client{
	Timeout: 15 * time.Second,
}

var (
	// Genesis reset on July 14, 2025 - post-genesis block 1 started at this time
	// Major blocks occur every 12 hours (cron: "0 */12 * * *")
	genesisResetTime   = time.Date(2025, 7, 14, 0, 0, 0, 0, time.UTC)
	majorBlockInterval = 12 * time.Hour
	// Pre-genesis offset: the old chain had 1,864 major blocks before the reset
	// Absolute block number = post-genesis block + 1864
	preGenesisBlockOffset int64 = 1864
)

// SupplyMetrics represents the supply data for ACME token
type SupplyMetrics struct {
	Max               int64 `json:"max"`
	Total             int64 `json:"total"`
	Circulating       int64 `json:"circulating"`
	CirculatingTokens int64 `json:"circulatingTokens"` // Alias for compatibility with Explorer
	Staked            int64 `json:"staked"`
}

// TimestampData represents cached timestamp information
type TimestampData struct {
	Chains     []ChainEntry `json:"chains"`
	Status     string       `json:"status,omitempty"`     // Transaction status: pending, delivered, etc.
	MinorBlock int64        `json:"minorBlock,omitempty"` // Minor block index (0 if pending)
	MajorBlock int64        `json:"majorBlock,omitempty"` // Major block index (0 if pending)
	// Internal cache fields (prefixed with underscore to hide from API consumers)
	HasBlockTime  bool  `json:"_hasBlockTime,omitempty"`  // If true, from block (never re-query). If false, from signature (keep checking for block)
	SignatureTime int64 `json:"_signatureTime,omitempty"` // Oldest signature timestamp (cached permanently)
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
	// Cache for supply metrics (in-memory, short-lived). metricsMu guards
	// all three fields and is held across a refresh, not just the read: that
	// makes a refresh-in-progress block, rather than duplicate, a concurrent
	// cache-miss request (previously unguarded — a data race, and on a
	// cache miss every concurrent caller independently queried every
	// staking account's balance — #102).
	metricsMu     sync.Mutex
	cachedMetrics *SupplyMetrics
	lastUpdate    time.Time
	cacheDuration = 5 * time.Minute

	// Guards the identity database refresh so an overrun refresh (the
	// background ticker fires every 30s) can't overlap itself.
	identityUpdateMu sync.Mutex

	// Persistent database for timestamps and identity map
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

// Database key prefixes
const (
	identityPrefix      = "identity:"
	metadataPrefix      = "metadata:"
	lastQueriedIndexKey = "metadata:lastQueriedIndex"
)

// Database helper functions for identity map storage

// getIdentityFromDB retrieves an identity from the database
func getIdentityFromDB(identityURL string) (*RegistrationIdentity, error) {
	data, err := timestampDB.Get([]byte(identityPrefix+identityURL), nil)
	if err != nil {
		return nil, err
	}

	var identity RegistrationIdentity
	if err := json.Unmarshal(data, &identity); err != nil {
		return nil, err
	}

	return &identity, nil
}

// saveIdentityToDB saves or updates an identity in the database
func saveIdentityToDB(identityURL string, identity *RegistrationIdentity) error {
	data, err := json.Marshal(identity)
	if err != nil {
		return err
	}

	return timestampDB.Put([]byte(identityPrefix+identityURL), data, nil)
}

// deleteIdentityFromDB removes an identity from the database
func deleteIdentityFromDB(identityURL string) error {
	return timestampDB.Delete([]byte(identityPrefix+identityURL), nil)
}

// getAllIdentitiesFromDB retrieves all identities from the database
func getAllIdentitiesFromDB() (map[string]*RegistrationIdentity, error) {
	identities := make(map[string]*RegistrationIdentity)

	iter := timestampDB.NewIterator(nil, nil)
	defer iter.Release()

	prefix := []byte(identityPrefix)
	for iter.Seek(prefix); iter.Valid(); iter.Next() {
		key := iter.Key()
		if !bytes.HasPrefix(key, prefix) {
			break
		}

		identityURL := string(key[len(prefix):])

		var identity RegistrationIdentity
		if err := json.Unmarshal(iter.Value(), &identity); err != nil {
			log.Printf("Warning: Failed to unmarshal identity %s: %v", identityURL, err)
			continue
		}

		identities[identityURL] = &identity
	}

	return identities, iter.Error()
}

// getLastQueriedIndex retrieves the last processed chain index
func getLastQueriedIndex() int64 {
	data, err := timestampDB.Get([]byte(lastQueriedIndexKey), nil)
	if err != nil {
		return -1 // Not found, start from beginning
	}

	var index int64
	if err := json.Unmarshal(data, &index); err != nil {
		return -1
	}

	return index
}

// setLastQueriedIndex updates the last processed chain index
func setLastQueriedIndex(index int64) error {
	data, err := json.Marshal(index)
	if err != nil {
		return err
	}

	return timestampDB.Put([]byte(lastQueriedIndexKey), data, nil)
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

	// Start background identity map updater
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			if err := refreshIdentityDatabase(); err != nil {
				log.Printf("Background update error: %v", err)
			}
		}
	}()

	router := mux.NewRouter()

	// API routes
	router.HandleFunc("/v1/supply", getSupplyHandler).Methods("GET", "OPTIONS")
	router.HandleFunc("/v1/timestamp/{txid}", getTimestampHandler).Methods("GET", "OPTIONS")
	router.HandleFunc("/staking/stakers/{url:.*}", getStakingAccountHandler).Methods("GET", "OPTIONS")
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

// StakingAccountInfo represents staking metadata for a specific account
type StakingAccountInfo struct {
	URL      string `json:"url"`
	Type     string `json:"type,omitempty"`
	Delegate string `json:"delegate,omitempty"`
	Rewards  string `json:"rewards,omitempty"`
	Identity string `json:"identity,omitempty"`
}

// Get staking account info handler
func getStakingAccountHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	accountURL := vars["url"]

	// Normalize URL: handle both acc:/ (from HTTP redirect) and missing prefix
	// HTTP clients may convert acc:// to acc:/ (single slash)
	if strings.HasPrefix(accountURL, "acc:/") && !strings.HasPrefix(accountURL, "acc://") {
		accountURL = "acc://" + accountURL[5:] // Convert acc:/domain to acc://domain
	} else if !strings.HasPrefix(accountURL, "acc://") {
		accountURL = "acc://" + accountURL
	}

	// Query registration data to find this account
	stakingInfo, err := queryStakingAccount(accountURL)
	if err != nil {
		log.Printf("Error querying staking account %s: %v", accountURL, err)
		http.Error(w, fmt.Sprintf("Account not found in staking registry: %v", err), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stakingInfo)
}

// Get supply metrics handler
func getSupplyHandler(w http.ResponseWriter, r *http.Request) {
	// metricsMu is held across the whole check-and-maybe-refresh, not just
	// the read: a refresh already in progress makes a concurrent request
	// wait for and share that result, rather than starting its own —
	// previously every concurrent cache-miss request queried every staking
	// account's balance independently (#102).
	metricsMu.Lock()
	defer metricsMu.Unlock()

	if cachedMetrics != nil && time.Since(lastUpdate) < cacheDuration {
		writeSupplyResponse(w, cachedMetrics, "HIT")
		return
	}

	metrics, err := fetchSupplyMetrics()
	if err != nil {
		// Serve the last good snapshot rather than nothing, but say so —
		// never synthesize a number in its place (#102).
		if cachedMetrics != nil {
			log.Printf("Error fetching metrics, serving stale cache: %v", err)
			writeSupplyResponse(w, cachedMetrics, "STALE")
			return
		}

		log.Printf("Error fetching metrics: %v", err)
		http.Error(w, "Failed to fetch metrics", http.StatusInternalServerError)
		return
	}

	cachedMetrics = metrics
	lastUpdate = time.Now()
	writeSupplyResponse(w, metrics, "MISS")
}

func writeSupplyResponse(w http.ResponseWriter, metrics *SupplyMetrics, cacheState string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cache", cacheState)
	json.NewEncoder(w).Encode(metrics)
}

// refreshIdentityDatabase runs updateIdentityDatabaseFromBlockchain, but
// never two calls at once: an overrun refresh (the background ticker fires
// every 30s) skips rather than overlaps.
func refreshIdentityDatabase() error {
	if !identityUpdateMu.TryLock() {
		log.Printf("Identity database refresh already in progress, skipping this tick")
		return nil
	}
	defer identityUpdateMu.Unlock()
	return updateIdentityDatabaseFromBlockchain()
}

// getIdentityMap returns the identity map as it currently stands in the
// database. It never reaches out to the blockchain: only the background
// ticker (refreshIdentityDatabase) does that. A request handler that
// triggered a full chain walk on every call used to let concurrent
// /staking/stakers/* requests each kick off their own (#102).
func getIdentityMap() (map[string]*RegistrationIdentity, error) {
	return getAllIdentitiesFromDB()
}

// updateIdentityDatabaseFromBlockchain queries new blockchain entries and updates the database
func updateIdentityDatabaseFromBlockchain() error {
	// Get current chain length
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
		return fmt.Errorf("failed to marshal chain request: %w", err)
	}

	resp, err := httpClient.Post(accumulateAPI, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to query chain: %w", err)
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
		return fmt.Errorf("failed to decode chain response: %w", err)
	}

	var totalEntries int64
	for _, chain := range chainResp.Result.Records {
		if chain.Name == "main" {
			totalEntries = chain.Count
			break
		}
	}

	if totalEntries == 0 {
		return fmt.Errorf("no entries found in main chain")
	}

	// Get last queried index
	lastIndex := getLastQueriedIndex()

	// Caught up: lastIndex only advances past entries actually applied (see
	// below), so this also correctly re-enters a run that left a gap last
	// time, rather than mistaking it for done.
	if lastIndex >= totalEntries-1 {
		return nil
	}

	if lastIndex < 0 {
		log.Printf("Initial database load: processing all %d entries", totalEntries)
	}

	// Determine start index
	startIndex := lastIndex + 1
	if startIndex < 0 {
		startIndex = 0
	}

	log.Printf("Updating identity database: processing entries %d to %d (total: %d)", startIndex, totalEntries-1, totalEntries-startIndex)

	// Process new entries in batches. firstGap tracks the lowest chain index
	// that could not be applied (a failed fetch, decode, or DB write) so
	// far — everything before it is durably recorded, but it and anything
	// after must not be marked done. Entries after a gap are still
	// attempted (a later entry failing shouldn't block earlier successes,
	// and re-applying an already-saved identity next run is harmless), but
	// the stored index only ever advances up to the gap, so the failed
	// entry — and anything after it, whether or not it happened to succeed
	// this run — is retried next time. Previously the index advanced past
	// every entry in the batch unconditionally, so a single failed fetch or
	// decode silently and permanently dropped that registration or
	// deletion (#102).
	batchSize := int64(100)
	newIdentities := 0
	updatedIdentities := 0
	firstGap := int64(-1)
	markGap := func(idx int64) {
		if firstGap < 0 || idx < firstGap {
			firstGap = idx
		}
	}

	for start := startIndex; start < totalEntries; start += batchSize {
		count := batchSize
		if start+count > totalEntries {
			count = totalEntries - start
		}

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
			log.Printf("Warning: failed to marshal request for entries %d-%d: %v (will retry next run)", start, start+count-1, err)
			markGap(start)
			continue
		}

		resp, err := httpClient.Post(accumulateAPI, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("Warning: failed to fetch entries %d-%d: %v (will retry next run)", start, start+count-1, err)
			markGap(start)
			continue
		}

		var rangeResp struct {
			Result struct {
				Records []struct {
					Entry string `json:"entry"`
				} `json:"records"`
			} `json:"result"`
		}
		decodeErr := json.NewDecoder(resp.Body).Decode(&rangeResp)
		resp.Body.Close()
		if decodeErr != nil {
			log.Printf("Warning: failed to decode entries %d-%d: %v (will retry next run)", start, start+count-1, decodeErr)
			markGap(start)
			continue
		}

		if int64(len(rangeResp.Result.Records)) < count {
			log.Printf("Warning: requested %d entries from %d but got %d (will retry from %d next run)",
				count, start, len(rangeResp.Result.Records), start+int64(len(rangeResp.Result.Records)))
			markGap(start + int64(len(rangeResp.Result.Records)))
		}

		for i, record := range rangeResp.Result.Records {
			idx := start + int64(i)
			identity, entryData, err := fetchRegistrationEntry(record.Entry)
			if err != nil {
				log.Printf("Warning: failed to process entry %d (%s): %v (will retry next run)", idx, record.Entry, err)
				markGap(idx)
				continue
			}
			if identity == "" {
				// Not a registration write, or one with no identity — there
				// is nothing to apply, so this entry is fully processed.
				continue
			}

			if entryData.Status == "deleted" {
				if err := deleteIdentityFromDB(identity); err != nil {
					log.Printf("Warning: failed to delete identity %s (entry %d): %v (will retry next run)", identity, idx, err)
					markGap(idx)
				}
				continue
			}

			if _, err := getIdentityFromDB(identity); err != nil {
				newIdentities++
			} else {
				updatedIdentities++
			}
			if err := saveIdentityToDB(identity, entryData); err != nil {
				log.Printf("Warning: failed to save identity %s (entry %d): %v (will retry next run)", identity, idx, err)
				markGap(idx)
			}
		}
	}

	// Only advance the stored index up to the first gap: entries at or
	// after it must be retried next run.
	processedThrough := totalEntries - 1
	if firstGap >= 0 {
		processedThrough = firstGap - 1
	}
	if processedThrough >= lastIndex {
		setLastQueriedIndex(processedThrough)
	}

	if newIdentities > 0 || updatedIdentities > 0 {
		log.Printf("Identity database updated: %d new, %d updated", newIdentities, updatedIdentities)
	}
	if firstGap >= 0 {
		log.Printf("Identity database update incomplete: stopped recording progress at entry %d of %d (will resume there next run)", firstGap, totalEntries)
	}

	return nil
}

// fetchRegistrationEntry fetches and parses a single registration chain
// entry. A non-nil error means the entry's content could not be
// determined (a network or decode failure) and must be retried. A nil
// error with an empty identity means the entry was read successfully and
// simply isn't a registration write (or names no identity) — nothing to
// retry.
func fetchRegistrationEntry(entry string) (identity string, data *RegistrationIdentity, err error) {
	txReq := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      0,
		"method":  "query",
		"params": map[string]interface{}{
			"scope": fmt.Sprintf("acc://%s@staking.acme/registered", entry),
			"query": map[string]interface{}{},
		},
	}

	txData, err := json.Marshal(txReq)
	if err != nil {
		return "", nil, fmt.Errorf("marshal request: %w", err)
	}

	txResp, err := httpClient.Post(accumulateAPI, "application/json", bytes.NewBuffer(txData))
	if err != nil {
		return "", nil, fmt.Errorf("query entry: %w", err)
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
		return "", nil, fmt.Errorf("decode entry: %w", err)
	}

	if txResult.Result.Message.Transaction.Body.Type != "writeData" {
		return "", nil, nil
	}
	dataArray := txResult.Result.Message.Transaction.Body.Entry.Data
	if len(dataArray) == 0 {
		return "", nil, nil
	}

	dataBytes, err := hex.DecodeString(dataArray[0])
	if err != nil {
		return "", nil, fmt.Errorf("decode entry data: %w", err)
	}
	var entryData RegistrationIdentity
	if err := json.Unmarshal(dataBytes, &entryData); err != nil {
		return "", nil, fmt.Errorf("unmarshal entry data: %w", err)
	}
	normalizeIdentity(&entryData)

	identity = entryData.Identity
	if identity == "" && entryData.Stake != "" {
		parts := strings.Split(entryData.Stake, "/")
		if len(parts) >= 3 {
			identity = strings.Join(parts[:3], "/")
		}
	}
	if identity == "" {
		return "", nil, nil
	}

	return identity, &entryData, nil
}

// queryStakedAmount queries the actual staked ACME from registered staking accounts
// Matches staking tool's LoadAllRegistered logic:
// 1. Build identity map from all chain entries (latest status per identity)
// 2. Skip deleted identities
// 3. Extract accounts from registered identities only
// 4. Query balances and sum
func queryStakedAmount() (int64, error) {
	// Get cached identity map
	identityMap, err := getIdentityMap()
	if err != nil {
		return 0, fmt.Errorf("failed to get identity map: %w", err)
	}

	// Extract accounts from registered identities only
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

	// Step 4: Query balance of each unique staking account and sum them up.
	// A failure here previously left that account's balance silently
	// excluded from the total, undercounting `staked` with no way to tell
	// from the response that anything was wrong — the same class of
	// problem as the issued/5 estimate below. So it fails the whole
	// computation instead: the caller falls back to the last good cached
	// total (serve-stale, flagged) rather than publish a wrong one (#102).
	var totalStakedRaw int64
	for accountURL := range uniqueAccounts {
		balance, err := queryAccountBalance(accountURL)
		if err != nil {
			return 0, fmt.Errorf("query balance of %s: %w", accountURL, err)
		}
		totalStakedRaw += balance
	}

	// Convert from smallest units to ACME tokens
	const acmePrecision = 100000000 // 10^8
	totalStaked := totalStakedRaw / acmePrecision

	log.Printf("Total staked: %d ACME (from %d unique accounts)", totalStaked, len(uniqueAccounts))

	return totalStaked, nil
}

// queryAccountBalance fetches a single account's balance, in smallest
// units. A non-2xx status previously went unchecked here — the body still
// decoded (into zero-value fields), so a failed query silently contributed
// nothing rather than being reported as a failure (#102).
func queryAccountBalance(accountURL string) (int64, error) {
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
		return 0, fmt.Errorf("marshal request: %w", err)
	}

	resp, err := httpClient.Post(accumulateAPI, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return 0, fmt.Errorf("request: %w", err)
	}
	// Deferred to this function, which runs once per account, so each
	// response body closes as that account's call returns. Deferring it in
	// the caller's per-account loop directly — as the previous code did —
	// would have kept every account's response body open until the whole
	// loop finished, all ~196 of them at once (#102).
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	var accResp struct {
		Result struct {
			Account struct {
				Type    string `json:"type"`
				Balance string `json:"balance"`
			} `json:"account"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&accResp); err != nil {
		return 0, fmt.Errorf("decode response: %w", err)
	}

	if accResp.Result.Account.Balance == "" {
		return 0, nil
	}
	var balance int64
	if _, err := fmt.Sscanf(accResp.Result.Account.Balance, "%d", &balance); err != nil {
		return 0, fmt.Errorf("parse balance %q: %w", accResp.Result.Account.Balance, err)
	}
	return balance, nil
}

// queryStakingAccount finds staking information for a specific account URL
func queryStakingAccount(accountURL string) (*StakingAccountInfo, error) {
	// Get cached identity map
	identityMap, err := getIdentityMap()
	if err != nil {
		return nil, fmt.Errorf("failed to get identity map: %w", err)
	}

	// Search for the account in the identity map
	for identityURL, entryData := range identityMap {
		if entryData.Status == "deleted" {
			continue
		}

		if entryData.Status == "registered" || entryData.Status == "" {
			for _, account := range entryData.Accounts {
				if account.Url == accountURL {
					// Found it!
					return &StakingAccountInfo{
						URL:      account.Url,
						Type:     account.Type,
						Delegate: account.Delegate,
						Rewards:  account.Payout,
						Identity: identityURL,
					}, nil
				}
			}
		}
	}

	return nil, fmt.Errorf("account not found in staking registry")
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

	resp, err := httpClient.Post(accumulateAPI, "application/json", bytes.NewBuffer(jsonData))
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

	// Query actual staked amount from registered staking accounts. A
	// failure here fails the whole refresh — the caller (getSupplyHandler)
	// falls back to the last good cached snapshot, flagged stale, rather
	// than publish the `issued / 5` guess this used to fall back to (#102).
	staked, err := queryStakedAmount()
	if err != nil {
		return nil, fmt.Errorf("failed to query staked amount: %w", err)
	}

	// Circulating = issued - staked
	circulating := issued - staked

	metrics := &SupplyMetrics{
		Max:               supplyLimit,
		Total:             issued,
		Circulating:       circulating,
		CirculatingTokens: circulating, // Same as Circulating for compatibility
		Staked:            staked,
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

	resp, err := httpClient.Post(accumulateAPI, "application/json", bytes.NewBuffer(jsonData))
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
	v2Resp, err := httpClient.Get(v2Url)
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
