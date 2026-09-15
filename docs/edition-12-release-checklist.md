# Edition 12 release checklist

- [x] Due schedule enqueue separated from worker claim
- [x] Scheduled occurrence idempotency preserved
- [x] Background lease metadata added
- [x] Stale worker recovery added
- [x] Bounded retry policy added
- [x] Provider timeout added
- [x] Retry-wait does not emit premature failure notification
- [x] Personal Context scopes persisted per run
- [x] Legacy claim RPC bridged to the same lifecycle
- [x] Web owner-scoped background status added
- [x] Android owner-scoped background status service added
- [x] No client lifecycle mutation authority added
- [x] Contract tests added
- [ ] Web Quality green
- [ ] Mobile Typecheck green
- [ ] Edition 11 PR #202 merged first
- [ ] Retarget Edition 12 PR to `main`
- [ ] Merge Edition 12 to `main`
- [ ] Production migration applied to verified KIVRYN Supabase project
- [ ] `agent-run` redeployed
- [ ] `scheduled-agent-runs` redeployed
- [ ] Background enqueue/claim/complete smoke verified
- [ ] Retry/no-premature-notification smoke verified

No Android AAB in Edition 12. Vercel build-rate limiting is not a repository completion blocker.
