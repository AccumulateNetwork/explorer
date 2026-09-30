package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/syndtr/goleveldb/leveldb"
)

// withTempDB points timestampDB at a fresh, empty LevelDB for the duration
// of the test, and restores the previous value afterward.
func withTempDB(t *testing.T) {
	t.Helper()
	dir := t.TempDir()
	db, err := leveldb.OpenFile(dir, nil)
	if err != nil {
		t.Fatalf("open temp db: %v", err)
	}
	prev := timestampDB
	timestampDB = db
	t.Cleanup(func() {
		db.Close()
		timestampDB = prev
	})
}

// withTestAPI points accumulateAPI (and accumulateAPIv2) at an httptest
// server for the duration of the test, and restores the previous values
// afterward.
func withTestAPI(t *testing.T, handler http.HandlerFunc) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(handler)
	prevV3, prevV2 := accumulateAPI, accumulateAPIv2
	accumulateAPI = srv.URL
	accumulateAPIv2 = srv.URL
	t.Cleanup(func() {
		srv.Close()
		accumulateAPI = prevV3
		accumulateAPIv2 = prevV2
	})
	return srv
}

func mustEncode(t *testing.T, w http.ResponseWriter, v interface{}) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		t.Fatalf("encode response: %v", err)
	}
}

// --- calculateMajorBlock ---

func TestCalculateMajorBlock(t *testing.T) {
	cases := []struct {
		name string
		t    time.Time
		want int64
	}{
		{"before genesis reset", genesisResetTime.Add(-time.Hour), 0},
		{"exactly at genesis reset", genesisResetTime, 1865},
		{"one interval after", genesisResetTime.Add(majorBlockInterval), 1866},
		{"just under one interval after", genesisResetTime.Add(majorBlockInterval - time.Second), 1865},
		{"ten intervals after", genesisResetTime.Add(10 * majorBlockInterval), 1875},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := calculateMajorBlock(c.t); got != c.want {
				t.Errorf("calculateMajorBlock(%v) = %d, want %d", c.t, got, c.want)
			}
		})
	}
}

// --- normalizeIdentity ---

func TestNormalizeIdentity(t *testing.T) {
	t.Run("no-op when Stake is empty", func(t *testing.T) {
		id := &RegistrationIdentity{Identity: "acc://alice.acme"}
		normalizeIdentity(id)
		if len(id.Accounts) != 0 {
			t.Errorf("expected no accounts, got %v", id.Accounts)
		}
	})

	t.Run("converts legacy fields into an Account and clears them", func(t *testing.T) {
		id := &RegistrationIdentity{
			Stake:    "acc://alice.acme/stake",
			Type:     "pure",
			Rewards:  "acc://alice.acme/rewards",
			Delegate: "acc://bob.acme/stake",
			Lockup:   4,
			HardLock: true,
		}
		normalizeIdentity(id)

		if len(id.Accounts) != 1 {
			t.Fatalf("expected 1 account, got %d", len(id.Accounts))
		}
		got := id.Accounts[0]
		want := Account{
			Type:     "pure",
			Url:      "acc://alice.acme/stake",
			Payout:   "acc://alice.acme/rewards",
			Delegate: "acc://bob.acme/stake",
			Lockup:   4,
			HardLock: true,
		}
		if got != want {
			t.Errorf("account = %+v, want %+v", got, want)
		}
		if id.DelegatorPayout != "acc://alice.acme/rewards" {
			t.Errorf("DelegatorPayout = %q, want the rewards account", id.DelegatorPayout)
		}
		if id.Stake != "" || id.Rewards != "" || id.Type != "" {
			t.Errorf("legacy fields not cleared: %+v", id)
		}
	})

	t.Run("defaults DelegatorPayout to Stake when Rewards is empty and delegates are accepted", func(t *testing.T) {
		id := &RegistrationIdentity{Stake: "acc://alice.acme/stake"}
		normalizeIdentity(id)
		if id.DelegatorPayout != "acc://alice.acme/stake" {
			t.Errorf("DelegatorPayout = %q, want the stake account", id.DelegatorPayout)
		}
	})

	t.Run("leaves DelegatorPayout unset when delegates are rejected", func(t *testing.T) {
		id := &RegistrationIdentity{Stake: "acc://alice.acme/stake", RejectDelegates: true}
		normalizeIdentity(id)
		if id.DelegatorPayout != "" {
			t.Errorf("DelegatorPayout = %q, want empty", id.DelegatorPayout)
		}
	})

	t.Run("is a no-op when already normalized", func(t *testing.T) {
		id := &RegistrationIdentity{
			Stake:    "acc://alice.acme/stake",
			Accounts: []Account{{Url: "acc://alice.acme/stake", Type: "pure"}},
		}
		normalizeIdentity(id)
		if len(id.Accounts) != 1 {
			t.Errorf("expected the existing account to be left alone, got %v", id.Accounts)
		}
		if id.Stake != "" {
			t.Errorf("legacy fields not cleared: %+v", id)
		}
	})
}

// --- timestamp extraction ---

func TestExtractTimestampFromSignature(t *testing.T) {
	t.Run("reads a timestamp at the top level", func(t *testing.T) {
		sig := map[string]interface{}{"timestamp": float64(12345)}
		if got := extractTimestampFromSignature(sig); got != 12345 {
			t.Errorf("got %d, want 12345", got)
		}
	})

	t.Run("recurses into a nested signature", func(t *testing.T) {
		sig := map[string]interface{}{
			"signature": map[string]interface{}{
				"signature": map[string]interface{}{"timestamp": float64(999)},
			},
		}
		if got := extractTimestampFromSignature(sig); got != 999 {
			t.Errorf("got %d, want 999", got)
		}
	})

	t.Run("returns 0 when no timestamp is found anywhere", func(t *testing.T) {
		if got := extractTimestampFromSignature(map[string]interface{}{}); got != 0 {
			t.Errorf("got %d, want 0", got)
		}
	})
}

func TestExtractTimestampFromMap(t *testing.T) {
	t.Run("extracts through message.signature", func(t *testing.T) {
		obj := map[string]interface{}{
			"message": map[string]interface{}{
				"signature": map[string]interface{}{"timestamp": float64(42)},
			},
		}
		if got := extractTimestampFromMap(obj); got != 42 {
			t.Errorf("got %d, want 42", got)
		}
	})

	t.Run("returns 0 for a non-map input", func(t *testing.T) {
		if got := extractTimestampFromMap("not a map"); got != 0 {
			t.Errorf("got %d, want 0", got)
		}
	})
}

// --- DB helpers ---

func TestLastQueriedIndexRoundTrip(t *testing.T) {
	withTempDB(t)

	if got := getLastQueriedIndex(); got != -1 {
		t.Errorf("unset index = %d, want -1", got)
	}

	if err := setLastQueriedIndex(41); err != nil {
		t.Fatalf("set: %v", err)
	}
	if got := getLastQueriedIndex(); got != 41 {
		t.Errorf("got %d, want 41", got)
	}
}

func TestIdentityDBRoundTrip(t *testing.T) {
	withTempDB(t)

	const url = "acc://alice.acme"
	if _, err := getIdentityFromDB(url); err == nil {
		t.Fatalf("expected an error for a missing identity")
	}

	id := &RegistrationIdentity{Identity: url, Status: "registered"}
	if err := saveIdentityToDB(url, id); err != nil {
		t.Fatalf("save: %v", err)
	}

	got, err := getIdentityFromDB(url)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Identity != url || got.Status != "registered" {
		t.Errorf("got %+v", got)
	}

	all, err := getAllIdentitiesFromDB()
	if err != nil {
		t.Fatalf("getAll: %v", err)
	}
	if len(all) != 1 || all[url] == nil {
		t.Errorf("getAll = %+v, want just %q", all, url)
	}

	if err := deleteIdentityFromDB(url); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := getIdentityFromDB(url); err == nil {
		t.Errorf("expected the identity to be gone after delete")
	}
}

// --- fetchRegistrationEntry ---

func writeDataResponse(entryData interface{}) map[string]interface{} {
	raw, _ := json.Marshal(entryData)
	return map[string]interface{}{
		"result": map[string]interface{}{
			"message": map[string]interface{}{
				"transaction": map[string]interface{}{
					"body": map[string]interface{}{
						"type": "writeData",
						"entry": map[string]interface{}{
							"data": []string{fmt.Sprintf("%x", raw)},
						},
					},
				},
			},
		},
	}
}

func TestFetchRegistrationEntry(t *testing.T) {
	t.Run("parses a writeData registration", func(t *testing.T) {
		withTestAPI(t, func(w http.ResponseWriter, r *http.Request) {
			mustEncode(t, w, writeDataResponse(RegistrationIdentity{
				Identity: "acc://alice.acme",
				Status:   "registered",
			}))
		})

		identity, data, err := fetchRegistrationEntry("someentry")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if identity != "acc://alice.acme" || data.Status != "registered" {
			t.Errorf("got identity=%q data=%+v", identity, data)
		}
	})

	t.Run("is a no-op, not an error, for a non-writeData transaction", func(t *testing.T) {
		withTestAPI(t, func(w http.ResponseWriter, r *http.Request) {
			mustEncode(t, w, map[string]interface{}{
				"result": map[string]interface{}{
					"message": map[string]interface{}{
						"transaction": map[string]interface{}{
							"body": map[string]interface{}{"type": "sendTokens"},
						},
					},
				},
			})
		})

		identity, data, err := fetchRegistrationEntry("someentry")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if identity != "" || data != nil {
			t.Errorf("expected no identity, got identity=%q data=%+v", identity, data)
		}
	})

	t.Run("errors on an unreachable server rather than silently skipping", func(t *testing.T) {
		srv := withTestAPI(t, func(w http.ResponseWriter, r *http.Request) {})
		srv.Close() // make the URL actually unreachable

		_, _, err := fetchRegistrationEntry("someentry")
		if err == nil {
			t.Fatalf("expected an error for an unreachable server")
		}
	})

	t.Run("errors on a malformed response rather than silently skipping", func(t *testing.T) {
		withTestAPI(t, func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("not json"))
		})

		_, _, err := fetchRegistrationEntry("someentry")
		if err == nil {
			t.Fatalf("expected an error for a malformed response")
		}
	})
}

// --- updateIdentityDatabaseFromBlockchain: the #102 gap-tracking fix ---

// registeredEntry builds the per-entry writeData response for chain entry
// `name`, registering identity acc://<name>.acme.
func registeredEntry(name string) map[string]interface{} {
	return writeDataResponse(RegistrationIdentity{
		Identity: fmt.Sprintf("acc://%s.acme", name),
		Status:   "registered",
	})
}

func TestUpdateIdentityDatabase_StopsBeforeAGap(t *testing.T) {
	withTempDB(t)

	// Three registration entries on the chain, at indices 0, 1, 2. Entry
	// 1's own transaction query fails every time it's attempted.
	entries := []string{"e0", "e1", "e2"}
	var e1Attempts atomic.Int32

	withTestAPI(t, func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Params struct {
				Scope string `json:"scope"`
				Query struct {
					QueryType string                 `json:"queryType"`
					Range     map[string]interface{} `json:"range"`
				} `json:"query"`
			} `json:"params"`
		}
		json.NewDecoder(r.Body).Decode(&req)

		entryQueryFor := func(name string) string {
			return fmt.Sprintf("acc://%s@staking.acme/registered", name)
		}

		switch {
		// The chain-length query and the range query share a scope and
		// queryType; only the range query names a range.
		case req.Params.Query.QueryType == "chain" && req.Params.Scope == "acc://staking.acme/registered" && req.Params.Query.Range == nil:
			mustEncode(t, w, map[string]interface{}{
				"result": map[string]interface{}{
					"records": []map[string]interface{}{
						{"name": "main", "count": len(entries)},
					},
				},
			})

		case req.Params.Query.QueryType == "chain" && req.Params.Scope == "acc://staking.acme/registered":
			// Honor the requested range: the app indexes each returned
			// record as start+i, so returning the wrong slice would
			// silently mislabel entries with the wrong chain index.
			start := int(req.Params.Query.Range["start"].(float64))
			count := int(req.Params.Query.Range["count"].(float64))
			end := start + count
			if end > len(entries) {
				end = len(entries)
			}
			var records []map[string]string
			for _, e := range entries[start:end] {
				records = append(records, map[string]string{"entry": e})
			}
			mustEncode(t, w, map[string]interface{}{
				"result": map[string]interface{}{"records": records},
			})

		case req.Params.Scope == entryQueryFor(entries[1]):
			e1Attempts.Add(1)
			w.WriteHeader(http.StatusInternalServerError)

		case req.Params.Scope == entryQueryFor(entries[0]):
			mustEncode(t, w, registeredEntry(entries[0]))

		case req.Params.Scope == entryQueryFor(entries[2]):
			mustEncode(t, w, registeredEntry(entries[2]))

		default:
			t.Fatalf("unexpected request scope %q", req.Params.Scope)
		}
	})

	if err := updateIdentityDatabaseFromBlockchain(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// e1 is the first gap, so lastQueriedIndex must stop at 0 (before it) —
	// not 2, which is what the old, unconditional
	// setLastQueriedIndex(totalEntries-1) would have recorded.
	if got := getLastQueriedIndex(); got != 0 {
		t.Errorf("lastQueriedIndex = %d, want 0 (stopped before the gap at entry 1)", got)
	}

	// e0 (before the gap) and e2 (after it — still attempted) should both
	// have been applied.
	if _, err := getIdentityFromDB("acc://e0.acme"); err != nil {
		t.Errorf("entry 0 was not applied: %v", err)
	}
	if _, err := getIdentityFromDB("acc://e2.acme"); err != nil {
		t.Errorf("entry 2 (after the gap) was not applied: %v", err)
	}

	if e1Attempts.Load() == 0 {
		t.Fatalf("entry 1 was never attempted")
	}

	// Running again with nothing changed retries from the gap, not "already
	// up to date": entry 1 still fails, so the recorded index is
	// unchanged, but it was attempted again.
	attemptsBefore := e1Attempts.Load()
	if err := updateIdentityDatabaseFromBlockchain(); err != nil {
		t.Fatalf("unexpected error on retry: %v", err)
	}
	if got := getLastQueriedIndex(); got != 0 {
		t.Errorf("lastQueriedIndex after retry = %d, want still 0", got)
	}
	if e1Attempts.Load() <= attemptsBefore {
		t.Errorf("entry 1 was not retried on the next run")
	}
}

func TestUpdateIdentityDatabase_NoNewEntriesIsANoOp(t *testing.T) {
	withTempDB(t)

	var chainQueries atomic.Int32
	withTestAPI(t, func(w http.ResponseWriter, r *http.Request) {
		chainQueries.Add(1)
		mustEncode(t, w, map[string]interface{}{
			"result": map[string]interface{}{
				"records": []map[string]interface{}{{"name": "main", "count": 5}},
			},
		})
	})

	if err := setLastQueriedIndex(4); err != nil { // already caught up
		t.Fatalf("setup: %v", err)
	}

	if err := updateIdentityDatabaseFromBlockchain(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := chainQueries.Load(); got != 1 {
		t.Errorf("chain length was queried %d times, want 1 (only to discover there's nothing new)", got)
	}
}

// --- queryAccountBalance ---

func TestQueryAccountBalance(t *testing.T) {
	t.Run("parses a balance", func(t *testing.T) {
		withTestAPI(t, func(w http.ResponseWriter, r *http.Request) {
			mustEncode(t, w, map[string]interface{}{
				"result": map[string]interface{}{
					"account": map[string]interface{}{"balance": "123456"},
				},
			})
		})
		got, err := queryAccountBalance("acc://alice.acme/tokens")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != 123456 {
			t.Errorf("got %d, want 123456", got)
		}
	})

	t.Run("treats a missing balance field as zero, not an error", func(t *testing.T) {
		withTestAPI(t, func(w http.ResponseWriter, r *http.Request) {
			mustEncode(t, w, map[string]interface{}{"result": map[string]interface{}{"account": map[string]interface{}{}}})
		})
		got, err := queryAccountBalance("acc://alice.acme/tokens")
		if err != nil || got != 0 {
			t.Errorf("got (%d, %v), want (0, nil)", got, err)
		}
	})

	t.Run("errors on a non-200 status instead of silently contributing zero", func(t *testing.T) {
		withTestAPI(t, func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
			mustEncode(t, w, map[string]interface{}{"result": map[string]interface{}{"account": map[string]interface{}{}}})
		})
		_, err := queryAccountBalance("acc://alice.acme/tokens")
		if err == nil {
			t.Fatalf("expected an error for a 500 status")
		}
	})
}

// --- getSupplyHandler: mutex-guarded refresh, stale fallback ---

func TestGetSupplyHandler_ConcurrentRequestsShareOneRefresh(t *testing.T) {
	withTempDB(t) // empty identity map: queryStakedAmount touches no accounts

	prevCachedMetrics, prevLastUpdate, prevCacheDuration := cachedMetrics, lastUpdate, cacheDuration
	cachedMetrics, lastUpdate = nil, time.Time{}
	cacheDuration = time.Minute
	t.Cleanup(func() {
		cachedMetrics, lastUpdate, cacheDuration = prevCachedMetrics, prevLastUpdate, prevCacheDuration
	})

	var issuerCalls atomic.Int32
	withTestAPI(t, func(w http.ResponseWriter, r *http.Request) {
		issuerCalls.Add(1)
		time.Sleep(50 * time.Millisecond) // widen the window for a race
		mustEncode(t, w, map[string]interface{}{
			"result": map[string]interface{}{
				"account": map[string]interface{}{
					"issued":      "100000000000",
					"supplyLimit": "800000000000",
				},
			},
		})
	})

	const n = 10
	results := make([]string, n)
	done := make(chan int, n)
	for i := 0; i < n; i++ {
		go func(i int) {
			w := httptest.NewRecorder()
			getSupplyHandler(w, httptest.NewRequest("GET", "/v1/supply", nil))
			results[i] = w.Header().Get("X-Cache")
			done <- i
		}(i)
	}
	for i := 0; i < n; i++ {
		<-done
	}

	if got := issuerCalls.Load(); got != 1 {
		t.Errorf("issuer endpoint was called %d times, want exactly 1 (concurrent requests should share one refresh)", got)
	}
	misses := 0
	for _, s := range results {
		switch s {
		case "MISS":
			misses++
		case "HIT":
		default:
			t.Errorf("unexpected X-Cache value %q", s)
		}
	}
	if misses != 1 {
		t.Errorf("got %d MISS responses, want exactly 1 (the rest should see the now-fresh cache as HIT)", misses)
	}
}

func TestGetSupplyHandler_ServesStaleOnFailureRatherThanAnEstimate(t *testing.T) {
	withTempDB(t)

	good := &SupplyMetrics{Max: 800, Total: 100, Circulating: 80, Staked: 20}
	prevCachedMetrics, prevLastUpdate, prevCacheDuration := cachedMetrics, lastUpdate, cacheDuration
	cachedMetrics, lastUpdate = good, time.Now()
	cacheDuration = 0 // force every request past the "still fresh" check
	t.Cleanup(func() {
		cachedMetrics, lastUpdate, cacheDuration = prevCachedMetrics, prevLastUpdate, prevCacheDuration
	})

	withTestAPI(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	})

	w := httptest.NewRecorder()
	getSupplyHandler(w, httptest.NewRequest("GET", "/v1/supply", nil))

	if got := w.Header().Get("X-Cache"); got != "STALE" {
		t.Errorf("X-Cache = %q, want STALE", got)
	}
	var got SupplyMetrics
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got != *good {
		t.Errorf("served %+v, want the untouched cached snapshot %+v (never a synthesized estimate)", got, *good)
	}
}
