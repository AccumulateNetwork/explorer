# Accumulate Network Helper Functions Design Document

## Overview

This document outlines the design and implementation of helper functions for interacting with the Accumulate Network. These functions provide a simplified interface for common operations such as creating accounts, managing tokens, and querying data, enabling developers to build applications and tests more efficiently.

## Architecture

The helper functions are organized into several categories:
1. Account Creation (Lite accounts, ADIs, Token accounts, Data accounts)
2. Token Management (Supply, Transfer)
3. Credit Management
4. Transaction Management
5. Query Functions
6. Data Extraction and Analysis

## Utility Functions by Category

### 1. Account Creation

#### Lite Account Functions
| Function | Description | File Location |
|----------|-------------|---------------|
| `generateLiteAccountKey` | Generates a key pair for a lite account | `accumulate_helpers.go` |
| `requestFaucetFunds` | Requests funds from the faucet for a lite account | `accumulate_helpers.go` |

#### ADI Creation Functions
| Function | Description | File Location |
|----------|-------------|---------------|
| `CreateADI` | Creates a new Accumulate Digital Identifier | `accumulate_helpers.go` |
| `generateADIKey` | Generates a key pair for an ADI | `accumulate_helpers.go` |

#### Token Account Functions
| Function | Description | File Location |
|----------|-------------|---------------|
| `CreateTokenAccount` | Creates a token account under an ADI | `accumulate_helpers.go` |
| `SupplyTokens` | Issues tokens to a token account | `accumulate_helpers.go` |

#### Data Account Functions
| Function | Description | File Location |
|----------|-------------|---------------|
| `CreateDataAccount` | Creates a data account under an ADI | `accumulate_helpers.go` |
| `WriteDataEntry` | Writes data to a data account | `accumulate_helpers.go` |

#### Key Management Functions
| Function | Description | File Location |
|----------|-------------|---------------|
| `CreateKeyBook` | Creates a key book for an ADI | `accumulate_helpers.go` |
| `CreateKeyPage` | Creates a key page in a key book | `accumulate_helpers.go` |
| `AddKeyToPage` | Adds a key to a key page | `accumulate_helpers.go` |

### 2. Token Management

| Function | Description | File Location |
|----------|-------------|---------------|
| `SupplyTokens` | Issues tokens to a token account | `accumulate_helpers.go` |
| `TransferTokens` | Transfers tokens between accounts | `accumulate_helpers.go` |
| `checkLiteAccountBalance` | Queries the balance of a lite account | `accumulate_helpers.go` |

### 3. Credit Management

| Function | Description | File Location |
|----------|-------------|---------------|
| `CreateCredits` | Converts ACME tokens to credits | `accumulate_helpers.go` |
| `AddCreditsToKeyPage` | Adds credits to a key page | `accumulate_helpers.go` |

### 4. Transaction Management

| Function | Description | File Location |
|----------|-------------|---------------|
| `WaitForTransaction` | Waits for a transaction to be executed | `accumulate_helpers.go` |
| `SignAndSubmitTx` | Signs and submits a transaction | `accumulate_helpers.go` |

### 5. Query Functions

| Function | Description | File Location |
|----------|-------------|---------------|
| `queryDataAccount` | Queries a data account | `data_account_mainnet_test.go`, `complex_adi_interactions_test.go` |
| `queryDataEntries` | Queries data entries from a data account | `data_account_mainnet_test.go`, `complex_adi_interactions_test.go` |
| `queryDataAccountInfo` | Queries information about a data account | `extract_data_account_transactions_test.go` |
| `queryDataEntriesBatch` | Queries a batch of data entries | `extract_data_account_transactions_test.go` |
| `queryADI` | Queries an ADI | `complex_adi_interactions_test.go` |
| `queryDirectory` | Queries an ADI's directory | `complex_adi_interactions_test.go` |
| `queryAccount` | Queries a token account | `complex_adi_interactions_test.go` |
| `queryKeybook` | Queries a keybook | `complex_adi_interactions_test.go` |
| `queryRecentTransactions` | Queries recent transactions for an account | `complex_adi_interactions_test.go` |

### 6. Data Extraction and Analysis

| Function | Description | File Location |
|----------|-------------|---------------|
| `extractEntryData` | Extracts data from an entry | `extract_data_account_transactions_test.go` |
| `isPrintableASCII` | Checks if data is printable ASCII | `extract_data_account_transactions_test.go` |
| `parseKeyValuePairs` | Parses key-value pairs from data | `extract_data_account_transactions_test.go` |
| `determineTransactionType` | Determines transaction type from data | `extract_data_account_transactions_test.go` |
| `analyzeTransactionParticipants` | Analyzes transaction participants | `complex_adi_interactions_test.go` |
| `analyzeKeybookAuthorities` | Analyzes keybook authorities | `complex_adi_interactions_test.go` |
| `countSignatures` | Counts signatures in a transaction | `complex_adi_interactions_test.go` |

## Accumulate Structure Creation Flow

### Creating Lite Accounts

```
generateLiteAccountKey() -> requestFaucetFunds() -> Lite Account Created
```

Lite accounts can be of two types:
- Lite Token Account: Holds ACME tokens
- Lite Data Account: Stores data entries

### Creating ADIs and Associated Accounts

```
generateLiteAccountKey() -> requestFaucetFunds() -> CreateADI() -> ADI Created
                                                 -> CreateTokenAccount() -> Token Account Created
                                                 -> CreateDataAccount() -> Data Account Created
                                                 -> CreateKeyBook() -> Key Book Created
                                                                    -> CreateKeyPage() -> Key Page Created
                                                                                       -> AddKeyToPage() -> Key Added
```

### Token Operations

```
SupplyTokens() -> Token Account Supplied
TransferTokens() -> Tokens Transferred Between Accounts
CreateCredits() -> ACME Tokens Converted to Credits
AddCreditsToKeyPage() -> Credits Added to Key Page
```

## Implementation Details

### Network Connectivity

The helper functions support multiple networks:
- Local development network (http://127.0.1.1:26660)
- Testnet (https://testnet.accumulatenetwork.io)
- Mainnet (https://mainnet.accumulatenetwork.io)

### Transaction Flow

1. Create transaction
2. Sign transaction
3. Submit transaction
4. Wait for execution confirmation

### Error Handling

All functions include comprehensive error handling with descriptive error messages to aid in debugging.

### Thread Safety

Mutex locking is used around funded account operations to ensure thread safety in concurrent scenarios.

## Usage Examples

### Creating and Using an ADI

```go
// Request funds from faucet
liteKey, liteURL, err := requestFaucetFunds(ctx, client, "local")

// Create ADI
adiKey, adiURL, err := CreateADI(ctx, client, liteKey, liteURL, "myadi")

// Create token account
tokenURL, err := CreateTokenAccount(ctx, client, adiKey, adiURL, "mytoken")

// Create data account
dataURL, err := CreateDataAccount(ctx, client, adiKey, adiURL, "mydata")

// Supply tokens
err = SupplyTokens(ctx, client, adiKey, tokenURL, 1000)

// Transfer tokens
err = TransferTokens(ctx, client, adiKey, tokenURL, recipientURL, 500)
```

### Creating Multiple ADIs for Testing

```go
// Create multiple ADIs
for i := 0; i < 5; i++ {
    adiName := fmt.Sprintf("testadi%d", i)
    adiKey, adiURL, err := CreateADI(ctx, client, liteKey, liteURL, adiName)
    
    // Create token and data accounts for each ADI
    tokenURL, err := CreateTokenAccount(ctx, client, adiKey, adiURL, "tokens")
    dataURL, err := CreateDataAccount(ctx, client, adiKey, adiURL, "data")
}
```

## Future Enhancements

1. **Batch Operations**: Implement batch creation of multiple accounts
2. **Advanced Query Functions**: Add more specialized query functions for complex scenarios
3. **Transaction Templates**: Create reusable transaction templates for common operations
4. **Monitoring Functions**: Add functions to monitor network status and account activity
5. **Multi-signature Support**: Enhance key management functions to support multi-signature operations
6. **Factom Chain Migration**: Add support for Factom chain migration to Accumulate

## Conclusion

These helper functions provide a comprehensive toolkit for interacting with the Accumulate Network, enabling developers to create and test applications more efficiently. By abstracting away the complexities of the underlying API, they allow developers to focus on building their applications rather than dealing with low-level protocol details.
