# Edition 9 test matrix

Contract coverage includes:
- registry domains, names and field metadata
- unsupported action rejection
- capability/domain isolation
- malformed and oversized plan rejection
- exact-plan approval and reapproval after changes
- no execution commands without approval
- deterministic action/request ids for retries
- audit metadata without payload contents
- orchestration modules have no direct database writes
- legacy action-name compatibility
- shared Agentic Core fail-closed behavior

Repository CI remains the authoritative execution gate before merge.
