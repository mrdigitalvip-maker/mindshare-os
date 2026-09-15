# Edition 9 security model

Trust boundary:
- model/planner output: untrusted
- Web/Android client: presentation + explicit approval collection, not action authority
- server Action Registry: allow-list authority
- existing `apply_nexora_action`: owner-scoped mutation authority and idempotent execution

Rules:
- reject unknown action names
- reject unknown payload fields
- reject plans outside allowed Agent domains
- reject stale approval after any plan change
- execute only explicitly approved step ids
- deterministic run/step action ids support executor idempotency
- orchestration modules do not directly write workspace tables
- audit metadata excludes action payload contents
- scheduled execution does not imply mutation approval
