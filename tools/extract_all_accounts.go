package main

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"

)

func main() {
	accumulateAPI := "https://mainnet.accumulatenetwork.io/v3"
	
	// Get total entries
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
	
	jsonData, _ := json.Marshal(chainReq)
	resp, _ := http.Post(accumulateAPI, "application/json", bytes.NewBuffer(jsonData))
	defer resp.Body.Close()
	
	var chainResp struct {
		Result struct {
			Records []struct {
				Name  string `json:"name"`
				Count int64  `json:"count"`
			} `json:"records"`
		} `json:"result"`
	}
	
	json.NewDecoder(resp.Body).Decode(&chainResp)
	
	var totalEntries int64
	for _, chain := range chainResp.Result.Records {
		if chain.Name == "main" {
			totalEntries = chain.Count
			break
		}
	}
	
	fmt.Printf("Total entries: %d\n\n", totalEntries)
	
	var allAccounts []string
	
	// Query all entries
	batchSize := int64(100)
	for start := int64(0); start < totalEntries; start += batchSize {
		count := batchSize
		if start+count > totalEntries {
			count = totalEntries - start
		}
		
		fmt.Printf("Querying entries %d-%d...\n", start, start+count-1)
		
		rangeReq := map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      int(start),
			"method":  "query",
			"params": map[string]interface{}{
				"scope": "acc://staking.acme/registered",
				"query": map[string]interface{}{
					"queryType": "chain",
					"name":      "main",
					"range": map[string]interface{}{
						"start": start,
						"count": count,
					},
				},
			},
		}
		
		jsonData, _ := json.Marshal(rangeReq)
		resp, _ := http.Post(accumulateAPI, "application/json", bytes.NewBuffer(jsonData))
		
		var rangeResp struct {
			Result struct {
				Records []struct {
					Entry string `json:"entry"`
				} `json:"records"`
			} `json:"result"`
		}
		
		json.NewDecoder(resp.Body).Decode(&rangeResp)
		resp.Body.Close()
		
		// Query each transaction
		for _, record := range rangeResp.Result.Records {
			txReq := map[string]interface{}{
				"jsonrpc": "2.0",
				"id":      0,
				"method":  "query",
				"params": map[string]interface{}{
					"scope": fmt.Sprintf("acc://%s@staking.acme/registered", record.Entry),
					"query": map[string]interface{}{},
				},
			}
			
			txData, _ := json.Marshal(txReq)
			txResp, err := http.Post(accumulateAPI, "application/json", bytes.NewBuffer(txData))
			if err != nil {
				continue
			}
			
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
			
			json.NewDecoder(txResp.Body).Decode(&txResult)
			txResp.Body.Close()
			
			if txResult.Result.Message.Transaction.Body.Type == "writeData" {
				dataArray := txResult.Result.Message.Transaction.Body.Entry.Data
				if len(dataArray) > 0 {
					dataBytes, _ := hex.DecodeString(dataArray[0])
					
					var entryData struct {
						Accounts []struct {
							Type string `json:"type"`
							URL  string `json:"url"`
						} `json:"accounts"`
						Status string `json:"status"`
					}
					
					if json.Unmarshal(dataBytes, &entryData) == nil {
						if entryData.Status == "registered" {
							for _, account := range entryData.Accounts {
								if account.URL != "" {
									allAccounts = append(allAccounts, account.URL)
								}
							}
						}
					}
				}
			}
		}
	}
	
	fmt.Printf("\n\nTotal accounts found: %d\n", len(allAccounts))
	
	// Deduplicate
	uniqueAccounts := make(map[string]bool)
	for _, url := range allAccounts {
		uniqueAccounts[url] = true
	}
	
	fmt.Printf("Unique accounts: %d\n\n", len(uniqueAccounts))
	
	// Print all unique URLs
	for url := range uniqueAccounts {
		fmt.Printf("\"%s\",\n", url)
	}
}
