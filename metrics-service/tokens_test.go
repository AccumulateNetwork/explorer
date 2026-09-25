package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/syndtr/goleveldb/leveldb"
)

func openTestDB(t *testing.T) *leveldb.DB {
	t.Helper()
	db, err := leveldb.OpenFile(filepath.Join(t.TempDir(), "db"), nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func writeSeed(t *testing.T, st tokenState) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "seed.json")
	raw, _ := json.Marshal(st)
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func tok(url, symbol, issued string, precision uint64) *TokenRecord {
	return &TokenRecord{URL: url, Symbol: symbol, Issued: issued, Precision: precision,
		Supply: decimalSupply(issued, precision), Partition: "Cyclops"}
}

func TestDecimalSupply(t *testing.T) {
	for _, c := range []struct {
		issued    string
		precision uint64
		want      string
	}{
		{"34149218556237373", 8, "341492185.56237373"},
		{"100000000", 8, "1"},
		{"5", 8, "0.00000005"},
		{"0", 8, "0"},
		{"12345", 0, "12345"},
	} {
		if got := decimalSupply(c.issued, c.precision); got != c.want {
			t.Errorf("decimalSupply(%s, %d) = %s, want %s", c.issued, c.precision, got, c.want)
		}
	}
}

func TestRankingIsExactAcrossPrecisions(t *testing.T) {
	// 2 whole tokens at precision 0 outrank 1.5 at precision 18, whose
	// base-unit figure is vastly larger.
	if compareSupply(tok("a", "A", "2", 0), tok("b", "B", "1500000000000000000", 18)) <= 0 {
		t.Fatal("precision-0 token should rank above")
	}
	// Past 2^53 a float would call these equal.
	if compareSupply(tok("a", "A", "9007199254740993", 0), tok("b", "B", "9007199254740994", 0)) >= 0 {
		t.Fatal("lost precision past 2^53")
	}
}

func TestLoadPrefersPersistedStateOverSeed(t *testing.T) {
	db := openTestDB(t)
	seed := writeSeed(t, tokenState{
		Network:    "mainnet",
		Partitions: []*TokenPartition{{ID: "Cyclops", Height: 10}},
		Tokens:     []*TokenRecord{tok("acc://ACME", "ACME", "100", 0)},
	})

	r, err := loadTokenRegistry(db, "http://unused", seed)
	if err != nil || r == nil {
		t.Fatalf("load: %v", err)
	}
	r.state.Partitions[0].Height = 99
	if err := r.persist(); err != nil {
		t.Fatal(err)
	}

	r2, err := loadTokenRegistry(db, "http://unused", seed)
	if err != nil {
		t.Fatal(err)
	}
	if h := r2.state.Partitions[0].Height; h != 99 {
		t.Fatalf("height = %d: reloaded the seed over newer persisted state", h)
	}
}

func TestLoadWithNoSeedIsDisabled(t *testing.T) {
	r, err := loadTokenRegistry(openTestDB(t), "http://unused", filepath.Join(t.TempDir(), "missing.json"))
	if err != nil || r != nil {
		t.Fatalf("want (nil, nil), got (%v, %v)", r, err)
	}
}

// fakeChain answers the JSON-RPC queries the follower makes.
type fakeChain struct {
	mu       sync.Mutex
	blocks   []map[string]any // non-empty blocks, ascending
	accounts map[string]map[string]any
	queried  []string
}

func (f *fakeChain) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	var call struct {
		Params struct {
			Scope string         `json:"scope"`
			Query map[string]any `json:"query"`
		} `json:"params"`
	}
	json.NewDecoder(req.Body).Decode(&call)
	f.mu.Lock()
	defer f.mu.Unlock()
	reply := func(v any) { json.NewEncoder(w).Encode(map[string]any{"jsonrpc": "2.0", "id": 1, "result": v}) }

	q := call.Params.Query
	switch {
	case q == nil:
		f.queried = append(f.queried, call.Params.Scope)
		a, ok := f.accounts[strings.ToLower(call.Params.Scope)]
		if !ok {
			json.NewEncoder(w).Encode(map[string]any{"jsonrpc": "2.0", "id": 1,
				"error": map[string]any{"code": -33404, "message": call.Params.Scope + " not found"}})
			return
		}
		reply(map[string]any{"recordType": "account", "account": a})

	case q["minorRange"] != nil:
		rng := q["minorRange"].(map[string]any)
		start, count := uint64(rng["start"].(float64)), int(rng["count"].(float64))
		var out []any
		for _, b := range f.blocks {
			if b["index"].(uint64) >= start && len(out) < count {
				// The range query truncates entries to two, as the real one
				// does for busy blocks.
				cp := map[string]any{"index": b["index"], "time": b["time"]}
				es := b["entries"].([]blockEntry)
				cp["entries"] = map[string]any{"records": es[:min(2, len(es))], "total": len(es)}
				out = append(out, cp)
			}
		}
		reply(map[string]any{"recordType": "range", "records": out})

	case q["minor"] != nil:
		idx := uint64(q["minor"].(float64))
		er := q["entryRange"].(map[string]any)
		start, count := int(er["start"].(float64)), int(er["count"].(float64))
		for _, b := range f.blocks {
			if b["index"].(uint64) == idx {
				es := b["entries"].([]blockEntry)
				end := min(start+count, len(es))
				if start > len(es) {
					start = len(es)
				}
				reply(map[string]any{"index": idx, "entries": map[string]any{"records": es[start:end], "total": len(es)}})
				return
			}
		}
		reply(map[string]any{"index": idx})
	}
}

func TestFollowAppliesBlockLedgerEntries(t *testing.T) {
	chain := &fakeChain{
		accounts: map[string]map[string]any{
			"acc://acme":           {"type": "tokenIssuer", "url": "acc://ACME", "symbol": "ACME", "precision": 8, "issued": "500000000"},
			"acc://new.acme/tok":   {"type": "tokenIssuer", "url": "acc://new.acme/tok", "symbol": "NEW", "precision": 0, "issued": "7"},
			"acc://new.acme/plain": {"type": "tokenAccount", "url": "acc://new.acme/plain"},
		},
		blocks: []map[string]any{
			{"index": uint64(15), "time": time.Unix(1, 0).UTC(), "entries": []blockEntry{
				{Account: "acc://bvn-Cyclops.acme/anchors", Name: "main", Index: 40},
				{Account: "acc://someone.acme/tokens", Name: "main", Index: 12}, // existing, not an issuer
				// Beyond the truncation point: must still be seen.
				{Account: "acc://ACME", Name: "main", Index: 900},
				{Account: "acc://new.acme/tok", Name: "main", Index: 0},
				{Account: "acc://new.acme/plain", Name: "main", Index: 0},
			}},
			{"index": uint64(9), "time": time.Unix(0, 0).UTC(), "entries": []blockEntry{
				{Account: "acc://ACME", Name: "main", Index: 1},
			}},
		},
	}
	srv := httptest.NewServer(chain)
	defer srv.Close()

	db := openTestDB(t)
	seed := writeSeed(t, tokenState{
		Network:    "mainnet",
		Partitions: []*TokenPartition{{ID: "Cyclops", Height: 10}},
		Tokens:     []*TokenRecord{tok("acc://ACME", "ACME", "100000000", 8)},
	})
	r, err := loadTokenRegistry(db, srv.URL, seed)
	if err != nil {
		t.Fatal(err)
	}
	if err := r.FollowOnce(); err != nil {
		t.Fatal(err)
	}

	if got := r.byURL["acc://acme"].Supply; got != "5" {
		t.Errorf("ACME supply = %s, want 5 (refreshed)", got)
	}
	if r.byURL["acc://new.acme/tok"] == nil {
		t.Error("new issuer at main index 0 was not added")
	}
	if r.byURL["acc://new.acme/plain"] != nil {
		t.Error("a new account that is not an issuer was added")
	}
	for _, q := range chain.queried {
		if strings.Contains(q, "someone.acme") {
			t.Error("queried an existing non-issuer account; only issuers and new accounts should be")
		}
	}
	if h := r.state.Partitions[0].Height; h != 15 {
		t.Errorf("cursor = %d, want 15", h)
	}
	if r.ranked[0].Symbol != "NEW" {
		t.Errorf("top = %s, want NEW (7 whole tokens beat 5)", r.ranked[0].Symbol)
	}

	// The cursor survives a restart, and a caught-up follower does nothing.
	r2, err := loadTokenRegistry(db, srv.URL, seed)
	if err != nil {
		t.Fatal(err)
	}
	if h := r2.state.Partitions[0].Height; h != 15 {
		t.Fatalf("persisted cursor = %d, want 15", h)
	}
	n := len(chain.queried)
	if err := r2.FollowOnce(); err != nil {
		t.Fatal(err)
	}
	if len(chain.queried) != n {
		t.Error("re-applied blocks already behind the cursor")
	}
}

func testRegistry(t *testing.T) *TokenRegistry {
	t.Helper()
	r := &TokenRegistry{state: tokenState{
		Partitions: []*TokenPartition{{ID: "Cyclops", Height: 1}},
		Tokens: []*TokenRecord{
			withLimit(tok("acc://ACME", "ACME", "34149218556237373", 8), "50000000000000000"),
			tok("acc://PegNet.acme/assets/peg", "peg", "391947574233025524", 8),
			tok("acc://eburgerpas.acme/tokens/weerter", "Weerter", "114358012", 2),
			tok("acc://small.acme/t", "SML", "1", 0),
		},
	}}
	r.reindex()
	return r
}

func withLimit(t *TokenRecord, limit string) *TokenRecord {
	t.SupplyLimit = limit
	return t
}

func get(t *testing.T, h http.HandlerFunc, target string) (*httptest.ResponseRecorder, tokensResponse) {
	t.Helper()
	w := httptest.NewRecorder()
	h(w, httptest.NewRequest("GET", target, nil))
	var body tokensResponse
	if w.Code == http.StatusOK {
		json.Unmarshal(w.Body.Bytes(), &body)
	}
	return w, body
}

func symbols(rs []*TokenRecord) string {
	var s []string
	for _, r := range rs {
		s = append(s, r.Symbol)
	}
	return strings.Join(s, ",")
}

func TestTopTokens(t *testing.T) {
	r := testRegistry(t)
	_, body := get(t, r.getTopTokensHandler, "/v1/tokens/top?count=3")
	if got := symbols(body.Result); got != "peg,ACME,Weerter" {
		t.Errorf("top 3 = %s", got)
	}
	if acme := body.Result[1]; acme.SupplyLimit != "50000000000000000" || acme.MaxSupply != "500000000" {
		t.Errorf("ACME limit %q, max supply %q", acme.SupplyLimit, acme.MaxSupply)
	}
	if body.Total != 4 || len(body.AsOf) != 1 {
		t.Errorf("total %d, asOf %d", body.Total, len(body.AsOf))
	}
}

func TestSearchByRegex(t *testing.T) {
	r := testRegistry(t)
	for _, c := range []struct{ q, want string }{
		{"^acme$", "ACME"},       // case-insensitive, on symbol
		{`pegnet\.acme/`, "peg"}, // on issuer URL
		{`^acc://[a-z]+\.acme/`, "peg,Weerter,SML"},
		{"nomatch", ""},
	} {
		w, body := get(t, r.getTokensHandler, "/v1/tokens?search="+urlQuery(c.q))
		if w.Code != http.StatusOK {
			t.Errorf("%q: status %d: %s", c.q, w.Code, w.Body)
			continue
		}
		if got := symbols(body.Result); got != c.want {
			t.Errorf("%q = %q, want %q", c.q, got, c.want)
		}
	}
}

func TestSearchRejectsBadPatterns(t *testing.T) {
	r := testRegistry(t)
	w, _ := get(t, r.getTokensHandler, "/v1/tokens?search="+urlQuery("(unclosed"))
	if w.Code != http.StatusBadRequest || !strings.Contains(w.Body.String(), "invalid regular expression") ||
		strings.Contains(w.Body.String(), "(?i)") {
		t.Errorf("invalid pattern: %d %s", w.Code, w.Body)
	}
	w, _ = get(t, r.getTokensHandler, "/v1/tokens?search="+strings.Repeat("a", maxSearchPattern+1))
	if w.Code != http.StatusBadRequest {
		t.Errorf("overlong pattern: %d", w.Code)
	}
}

func TestSearchPathologicalPatternIsFast(t *testing.T) {
	r := testRegistry(t)
	r.state.Tokens = append(r.state.Tokens, tok("acc://"+strings.Repeat("a", 5000)+"!", "X", "1", 0))
	r.reindex()
	start := time.Now()
	w, _ := get(t, r.getTokensHandler, "/v1/tokens?search="+urlQuery("(a+)+$"))
	if w.Code != http.StatusOK {
		t.Fatalf("status %d", w.Code)
	}
	if d := time.Since(start); d > time.Second {
		t.Fatalf("took %v: backtracking", d)
	}
}

func TestPaging(t *testing.T) {
	r := testRegistry(t)
	_, body := get(t, r.getTokensHandler, "/v1/tokens?start=2&count=5")
	if got := symbols(body.Result); got != "Weerter,SML" || body.Total != 4 {
		t.Errorf("page = %s (total %d)", got, body.Total)
	}
	_, body = get(t, r.getTokensHandler, "/v1/tokens?start=10")
	if len(body.Result) != 0 || body.Result == nil {
		t.Errorf("past the end should be an empty list, got %v", body.Result)
	}
}

func urlQuery(s string) string {
	r := strings.NewReplacer("%", "%25", "+", "%2B", "&", "%26", "#", "%23", " ", "%20", "\\", "%5C", "^", "%5E", "$", "%24", "(", "%28", ")", "%29", "[", "%5B", "]", "%5D")
	return r.Replace(s)
}
