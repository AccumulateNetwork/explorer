package main

// Token registry (explorer#88).
//
// Seeded offline: accumulate's tools/cmd/token-registry walks every account
// in the partition databases and writes the token issuers, plus the block
// each partition is current as of. This service loads that seed once, then
// keeps it current online by following block ledger entries from there, so
// the only online work is the (small) stretch since the seed.
//
// Following needs no message bodies. Per entry:
//   - on a known issuer: its supply may have changed, re-query it;
//   - index 0 of an account's main chain: the account is new, query it once
//     and add it if it is a token issuer. An account's type never changes,
//     so an account that already existed cannot become an issuer later.

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/syndtr/goleveldb/leveldb"
)

const (
	tokenStateKey      = "tokens:state"
	tokenSeedPathEnv   = "TOKEN_REGISTRY_SEED"
	tokenSeedPathDef   = "./data/token-registry.json"
	tokenFollowPeriod  = 60 * time.Second
	tokenBlocksPerPage = 100
	tokenEntriesPage   = 1000
	maxSearchPattern   = 256
	maxTokensPage      = 100
)

// TokenRecord is one issuer, as the seed tool writes it and as the API serves
// it.
type TokenRecord struct {
	URL         string `json:"url"`
	Symbol      string `json:"symbol"`
	Precision   uint64 `json:"precision"`
	Issued      string `json:"issued"`
	Supply      string `json:"supply"`
	SupplyLimit string `json:"supplyLimit,omitempty"`
	MaxSupply   string `json:"maxSupply,omitempty"` // SupplyLimit in whole tokens
	Properties  string `json:"properties,omitempty"`
	Partition   string `json:"partition"`
}

// TokenPartition is a partition and the last block the registry has applied.
type TokenPartition struct {
	ID     string    `json:"id"`
	Height uint64    `json:"height"`
	Time   time.Time `json:"time"`
}

type tokenState struct {
	Network    string            `json:"network"`
	Partitions []*TokenPartition `json:"partitions"`
	Tokens     []*TokenRecord    `json:"tokens"`
}

// TokenRegistry is the in-memory registry, persisted to the service DB.
type TokenRegistry struct {
	mu      sync.RWMutex
	state   tokenState
	byURL   map[string]*TokenRecord
	ranked  []*TokenRecord // greatest supply first
	db      *leveldb.DB
	api     string
	client  *http.Client
	lastRun time.Time
	lastErr error
}

var tokens *TokenRegistry

// loadTokenRegistry restores the persisted registry, or seeds it from the
// file the offline tool wrote. It returns nil when there is neither, and the
// token endpoints then answer 503.
func loadTokenRegistry(db *leveldb.DB, api, seedPath string) (*TokenRegistry, error) {
	r := &TokenRegistry{db: db, api: api, client: &http.Client{Timeout: 60 * time.Second}}

	raw, err := db.Get([]byte(tokenStateKey), nil)
	switch {
	case err == nil:
		// Persisted state always wins over the seed: it is newer.
	case errors.Is(err, leveldb.ErrNotFound):
		raw, err = os.ReadFile(seedPath)
		if errors.Is(err, os.ErrNotExist) {
			return nil, nil
		}
		if err != nil {
			return nil, fmt.Errorf("read seed %s: %w", seedPath, err)
		}
		log.Printf("Token registry: seeding from %s", seedPath)
	default:
		return nil, fmt.Errorf("load token state: %w", err)
	}

	if err := json.Unmarshal(raw, &r.state); err != nil {
		return nil, fmt.Errorf("decode token state: %w", err)
	}
	if len(r.state.Partitions) == 0 {
		return nil, errors.New("token state has no partitions")
	}
	r.reindex()
	return r, r.persist()
}

func (r *TokenRegistry) reindex() {
	r.byURL = make(map[string]*TokenRecord, len(r.state.Tokens))
	for _, t := range r.state.Tokens {
		r.byURL[strings.ToLower(t.URL)] = t
		if t.SupplyLimit != "" {
			t.MaxSupply = decimalSupply(t.SupplyLimit, t.Precision)
		}
	}
	r.ranked = append(r.ranked[:0], r.state.Tokens...)
	sort.SliceStable(r.ranked, func(i, j int) bool {
		if c := compareSupply(r.ranked[i], r.ranked[j]); c != 0 {
			return c > 0
		}
		return r.ranked[i].URL < r.ranked[j].URL
	})
}

func (r *TokenRegistry) persist() error {
	raw, err := json.Marshal(&r.state)
	if err != nil {
		return err
	}
	return r.db.Put([]byte(tokenStateKey), raw, nil)
}

// compareSupply compares Issued/10^Precision exactly. Issued exceeds 2^53 and
// precisions differ, so neither floats nor raw base units will do.
func compareSupply(a, b *TokenRecord) int {
	x, _ := new(big.Int).SetString(a.Issued, 10)
	y, _ := new(big.Int).SetString(b.Issued, 10)
	if x == nil || y == nil {
		return 0
	}
	x.Mul(x, pow10(b.Precision))
	y.Mul(y, pow10(a.Precision))
	return x.Cmp(y)
}

func pow10(n uint64) *big.Int {
	return new(big.Int).Exp(big.NewInt(10), new(big.Int).SetUint64(n), nil)
}

// decimalSupply renders issued/10^precision without rounding.
func decimalSupply(issued string, precision uint64) string {
	v, ok := new(big.Int).SetString(issued, 10)
	if !ok {
		return ""
	}
	s := new(big.Int).Abs(v).String()
	if precision > 0 {
		n := int(precision)
		if len(s) <= n {
			s = strings.Repeat("0", n-len(s)+1) + s
		}
		i := len(s) - n
		s = strings.TrimSuffix(strings.TrimRight(s[:i]+"."+s[i:], "0"), ".")
	}
	if v.Sign() < 0 {
		s = "-" + s
	}
	return s
}

// ---- Following ----

func partitionScope(id string) string {
	if strings.EqualFold(id, "Directory") {
		return "acc://dn.acme"
	}
	return "acc://bvn-" + id + ".acme"
}

type blockEntry struct {
	Account string `json:"account"`
	Name    string `json:"name"`
	Index   uint64 `json:"index"`
}

type entryRange struct {
	Records []blockEntry `json:"records"`
	Total   uint64       `json:"total"`
}

type minorBlock struct {
	Index   uint64      `json:"index"`
	Time    time.Time   `json:"time"`
	Entries *entryRange `json:"entries"`
}

func (r *TokenRegistry) rpc(params any, result any) error {
	body, _ := json.Marshal(map[string]any{"jsonrpc": "2.0", "id": 1, "method": "query", "params": params})
	resp, err := r.client.Post(r.api, "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	var env struct {
		Result json.RawMessage `json:"result"`
		Error  *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&env); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}
	if env.Error != nil {
		return &rpcError{Code: env.Error.Code, Message: env.Error.Message}
	}
	return json.Unmarshal(env.Result, result)
}

type rpcError struct {
	Code    int
	Message string
}

func (e *rpcError) Error() string { return fmt.Sprintf("rpc %d: %s", e.Code, e.Message) }

func isNotFound(err error) bool {
	var re *rpcError
	return errors.As(err, &re) && strings.Contains(strings.ToLower(re.Message), "not found")
}

// Follow runs the follower until the process exits.
func (r *TokenRegistry) Follow() {
	for {
		err := r.FollowOnce()
		r.mu.Lock()
		r.lastRun, r.lastErr = time.Now(), err
		r.mu.Unlock()
		if err != nil {
			log.Printf("Token registry: %v", err)
		}
		time.Sleep(tokenFollowPeriod)
	}
}

// FollowOnce applies every non-empty block after each partition's cursor.
func (r *TokenRegistry) FollowOnce() error {
	r.mu.RLock()
	parts := make([]TokenPartition, len(r.state.Partitions))
	for i, p := range r.state.Partitions {
		parts[i] = *p
	}
	r.mu.RUnlock()

	for i := range parts {
		if err := r.followPartition(&parts[i]); err != nil {
			return fmt.Errorf("%s: %w", parts[i].ID, err)
		}
	}
	return nil
}

func (r *TokenRegistry) followPartition(p *TokenPartition) error {
	scope := partitionScope(p.ID)
	for {
		var page struct {
			Records []*minorBlock `json:"records"`
		}
		err := r.rpc(map[string]any{
			"scope": scope,
			"query": map[string]any{
				"queryType":  "block",
				"minorRange": map[string]any{"start": p.Height + 1, "count": tokenBlocksPerPage},
				"omitEmpty":  true,
			},
		}, &page)
		if err != nil {
			return fmt.Errorf("blocks after %d: %w", p.Height, err)
		}
		if len(page.Records) == 0 {
			return nil // at the tip
		}

		touched := map[string]bool{}
		for _, b := range page.Records {
			entries, err := r.allEntries(scope, b)
			if err != nil {
				return err
			}
			r.mu.RLock()
			for _, e := range entries {
				key := strings.ToLower(e.Account)
				if r.byURL[key] != nil || (e.Name == "main" && e.Index == 0) {
					touched[e.Account] = true
				}
			}
			r.mu.RUnlock()
		}
		for u := range touched {
			if err := r.refresh(u, p.ID); err != nil {
				return fmt.Errorf("refresh %s: %w", u, err)
			}
		}

		last := page.Records[len(page.Records)-1]
		r.mu.Lock()
		for _, sp := range r.state.Partitions {
			if sp.ID == p.ID {
				sp.Height, sp.Time = last.Index, last.Time
			}
		}
		r.reindex()
		err = r.persist()
		r.mu.Unlock()
		if err != nil {
			return fmt.Errorf("persist: %w", err)
		}
		p.Height = last.Index

		if len(page.Records) < tokenBlocksPerPage {
			return nil
		}
	}
}

// allEntries returns every entry of a block; the range query may truncate a
// busy block's entry list, and then the block is fetched on its own, paged.
func (r *TokenRegistry) allEntries(scope string, b *minorBlock) ([]blockEntry, error) {
	if b.Entries == nil {
		return nil, nil
	}
	if uint64(len(b.Entries.Records)) >= b.Entries.Total {
		return b.Entries.Records, nil
	}
	var all []blockEntry
	for start := uint64(0); start < b.Entries.Total; start += tokenEntriesPage {
		var blk minorBlock
		err := r.rpc(map[string]any{
			"scope": scope,
			"query": map[string]any{
				"queryType":  "block",
				"minor":      b.Index,
				"entryRange": map[string]any{"start": start, "count": tokenEntriesPage},
			},
		}, &blk)
		if err != nil {
			return nil, fmt.Errorf("block %d entries from %d: %w", b.Index, start, err)
		}
		if blk.Entries == nil || len(blk.Entries.Records) == 0 {
			break
		}
		all = append(all, blk.Entries.Records...)
	}
	return all, nil
}

// refresh re-reads one account and updates the registry to match.
func (r *TokenRegistry) refresh(u, partition string) error {
	var rec struct {
		Account struct {
			Type        string `json:"type"`
			URL         string `json:"url"`
			Symbol      string `json:"symbol"`
			Precision   uint64 `json:"precision"`
			Issued      string `json:"issued"`
			SupplyLimit string `json:"supplyLimit"`
			Properties  string `json:"properties"`
		} `json:"account"`
	}
	err := r.rpc(map[string]any{"scope": u}, &rec)
	gone := isNotFound(err)
	if err != nil && !gone {
		return err
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	key := strings.ToLower(u)
	if gone || !strings.EqualFold(rec.Account.Type, "tokenIssuer") {
		if r.byURL[key] != nil {
			r.removeLocked(key)
		}
		return nil
	}

	a := rec.Account
	if a.Issued == "" {
		a.Issued = "0"
	}
	t := &TokenRecord{
		URL:         a.URL,
		Symbol:      a.Symbol,
		Precision:   a.Precision,
		Issued:      a.Issued,
		Supply:      decimalSupply(a.Issued, a.Precision),
		SupplyLimit: a.SupplyLimit,
		Properties:  a.Properties,
		Partition:   partition,
	}
	if old := r.byURL[key]; old != nil {
		*old = *t
		return nil
	}
	log.Printf("Token registry: new token issuer %s (%s)", t.URL, t.Symbol)
	r.state.Tokens = append(r.state.Tokens, t)
	r.byURL[key] = t
	return nil
}

func (r *TokenRegistry) removeLocked(key string) {
	out := r.state.Tokens[:0]
	for _, t := range r.state.Tokens {
		if strings.ToLower(t.URL) != key {
			out = append(out, t)
		}
	}
	r.state.Tokens = out
	delete(r.byURL, key)
}

// ---- HTTP ----

type tokensResponse struct {
	Total  int               `json:"total"`
	Result []*TokenRecord    `json:"result"`
	AsOf   []*TokenPartition `json:"asOf"`
}

func (r *TokenRegistry) asOfLocked() []*TokenPartition {
	out := make([]*TokenPartition, len(r.state.Partitions))
	for i, p := range r.state.Partitions {
		cp := *p
		out[i] = &cp
	}
	return out
}

func writeTokensJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func intParam(req *http.Request, name string, def, max int) (int, error) {
	s := req.URL.Query().Get(name)
	if s == "" {
		return def, nil
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < 0 {
		return 0, fmt.Errorf("%s must be a non-negative integer", name)
	}
	if max > 0 && n > max {
		n = max
	}
	return n, nil
}

// getTopTokensHandler serves the tokens with the greatest supply.
func (r *TokenRegistry) getTopTokensHandler(w http.ResponseWriter, req *http.Request) {
	count, err := intParam(req, "count", 10, maxTokensPage)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	n := min(count, len(r.ranked))
	writeTokensJSON(w, &tokensResponse{Total: len(r.ranked), Result: r.ranked[:n], AsOf: r.asOfLocked()})
}

// getTokensHandler pages through the registry, greatest supply first,
// optionally filtered by a regular expression over symbol and issuer URL.
// Go's regexp is RE2: matching is linear in the input, so a pathological
// pattern cannot hang the service.
func (r *TokenRegistry) getTokensHandler(w http.ResponseWriter, req *http.Request) {
	start, err := intParam(req, "start", 0, 0)
	if err == nil {
		var count int
		count, err = intParam(req, "count", 10, maxTokensPage)
		if err == nil {
			r.serveTokens(w, req, start, count)
			return
		}
	}
	http.Error(w, err.Error(), http.StatusBadRequest)
}

func (r *TokenRegistry) serveTokens(w http.ResponseWriter, req *http.Request, start, count int) {
	var re *regexp.Regexp
	if pat := req.URL.Query().Get("search"); pat != "" {
		if len(pat) > maxSearchPattern {
			http.Error(w, fmt.Sprintf("search pattern is longer than %d characters", maxSearchPattern), http.StatusBadRequest)
			return
		}
		var err error
		re, err = regexp.Compile("(?i)" + pat)
		if err != nil {
			// Report it against the pattern as typed, not our (?i) prefix.
			msg := strings.TrimPrefix(err.Error(), "error parsing regexp: ")
			msg = strings.Replace(msg, "`(?i)", "`", 1)
			http.Error(w, "invalid regular expression: "+msg, http.StatusBadRequest)
			return
		}
	}

	r.mu.RLock()
	defer r.mu.RUnlock()
	matches := r.ranked
	if re != nil {
		matches = nil
		for _, t := range r.ranked {
			if re.MatchString(t.Symbol) || re.MatchString(t.URL) {
				matches = append(matches, t)
			}
		}
	}
	page := []*TokenRecord{}
	if start < len(matches) {
		page = matches[start:min(start+count, len(matches))]
	}
	writeTokensJSON(w, &tokensResponse{Total: len(matches), Result: page, AsOf: r.asOfLocked()})
}

// tokenHealth reports follower state for /health.
func (r *TokenRegistry) tokenHealth() map[string]any {
	if r == nil {
		return map[string]any{"enabled": false}
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	h := map[string]any{
		"enabled":    true,
		"tokens":     len(r.state.Tokens),
		"partitions": r.asOfLocked(),
		"lastRun":    r.lastRun,
	}
	if r.lastErr != nil {
		h["lastError"] = r.lastErr.Error()
	}
	return h
}

// tokensUnavailable answers when no registry has been seeded.
func tokensUnavailable(w http.ResponseWriter, _ *http.Request) {
	http.Error(w, "token registry not seeded", http.StatusServiceUnavailable)
}
