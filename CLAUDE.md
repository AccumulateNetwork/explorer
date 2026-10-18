# Accumulate Explorer - Development Notes

## MANDATORY: Review Tracking Repository Before Development

**FIRST ACTION before any development work:**
1. **Review**: `~/go/src/gitlab.com/AccumulateNetwork/tracking_repo/CLAUDE.md`
2. **Check**: Latest development rules, file naming standards, TDD requirements

## Using the Orchestrator (MANDATORY)

All work MUST use the orchestrator (`orch`) for workflow enforcement:

```bash
orch start 25 explorer      # Start work on issue #25
orch status                 # Check current status
orch commit "Add feature"   # Commit with issue reference
orch mr                     # Create draft merge request
orch finish                 # Complete work session
```

## Tracking MCP Server

Use the tracking MCP for project management and standards enforcement.

### Before Starting Work
- Call `start-new-issue` prompt to verify issue/MR status
- Call `find-docs` to search relevant documentation

### Before Commits
- Call `pre-commit-check` prompt for validation
- Call `verify-test-coverage` to confirm 80% coverage

### Before Merge Requests
- Call `pre-mr-validation` prompt for complete validation
- Call `verify-issue-status` to confirm issue/MR states

### Available Tools
- `verify-issue-status` - Check GitLab issue and MR status
- `validate-filename` - Check filename naming rules
- `check-test-first` - Verify TDD compliance
- `verify-test-coverage` - Confirm coverage threshold
- `query-issues` - Search issues with filters
- `generate-report` - Create formatted reports
- `find-docs` - Search documentation

## Project Overview

Block explorer for the Accumulate blockchain network.

## File Naming Standards
- **NEVER** use ALL_CAPS_FILE_NAMES
- **ALWAYS** use lowercase-with-hyphens
