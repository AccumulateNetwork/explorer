# Staking Account Detection

## Overview

The metrics service queries `acc://staking.acme/registered` to find all registered staking accounts and calculate the total staked ACME.

## Account Count: 196 vs 197

### Period 169 Staking Report
- **197 total recipients** listed in the report
- Includes: 196 staking accounts + 1 governance recipient (ANAF)

### Metrics Service
- **196 staking accounts** (excludes ANAF)
- Correctly calculates total staked ACME from accounts with locked tokens

### Why ANAF is Excluded

`acc://anaf.acme/tokens` is the **governance withholding recipient** (receives 45% of weekly staking budget per governance motion) but is **NOT a staking account**:
- **Staked Balance**: 0 ACME (no locked tokens)
- **Status**: Governance recipient, not registered in `acc://staking.acme/registered`
- **Purpose**: Receives distribution but doesn't stake tokens

For calculating **total locked/staked ACME**, ANAF is correctly excluded.

## Implementation Details

### Data Structures

The service supports both modern (multi-account) and legacy (single-account) registration formats:

```go
type RegistrationIdentity struct {
    // Modern format
    Identity        string
    Accounts        []Account
    Status          string

    // Legacy format (backward compatibility)
    Stake    string
    Rewards  string
    Type     string
}
```

### Account Extraction Process

1. **Query all entries** from `acc://staking.acme/registered` main chain
2. **Build identity map**: Track latest registration per identity (handles re-registrations)
3. **Normalize legacy format**: Convert old single-account format to modern multi-account format
4. **Filter by status**:
   - Include: `status="registered"` or missing status (legacy entries)
   - Exclude: `status="deleted"`
5. **Extract accounts**: Get all account URLs from each registered identity
6. **Deduplicate**: Remove duplicate account URLs (same account can appear in multiple identities)
7. **Query balances**: Sum ACME balance across all unique accounts

### Account Deduplication

The service correctly handles cases where the same account URL appears in multiple identity registrations:

**Example**: `acc://jaysmith.acme/staking` appears in both:
- `acc://jaysmith.acme` (owns the account)
- `acc://CodeForj.acme` (also registered this account)

The account is counted **once** for balance calculation (can't count the same balance twice), resulting in:
- 197 account references extracted
- 196 unique account URLs after deduplication
- Correct total staked ACME (balance only counted once)

## Current Metrics (as of 2026-02-23)

- **195 registered identities**
  - 188 with `status="registered"`
  - 7 legacy entries (no explicit status field)
  - 0 deleted
- **196 unique staking accounts**
- **201.7M ACME staked** (61.9% of total supply)

## Validation

Compare with staking tool:
```bash
cd /home/paul/go/src/gitlab.com/AccumulateNetwork/staking
go run ./cmd/list-all-accounts | sort | uniq | wc -l
# Should return 196 (same as metrics service)
```

## References

- [Staking Account Requirements](https://gitlab.com/accumulatenetwork/core/staking/-/blob/develop/docs/staking/account-requirements.md)
- [ANAF Withholding Documentation](https://gitlab.com/accumulatenetwork/core/staking/-/blob/develop/docs/governance/anaf-withholding-redirect.md)
- [Period 169 Report](https://gitlab.com/accumulatenetwork/core/staking/-/blob/develop/docs/reports/staking-report-period-169.xlsx)
