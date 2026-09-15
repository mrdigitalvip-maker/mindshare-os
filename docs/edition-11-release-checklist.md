# KIVRYN Edition 11 — release checklist

## Implementation
- [x] Personal Context Engine added
- [x] Capability → context-scope authority defined
- [x] Profile/preferences baseline minimized
- [x] Tasks/Projects context limited to planning/productivity Agents
- [x] Studies/Passport context limited to study Agents
- [x] Explicit owner filters on privileged reads
- [x] Context row and character budgets enforced
- [x] Prompt-injection boundary for context data added
- [x] Manual Agent runs use Personal Context
- [x] Scheduled Agent runs use the same executor
- [x] Assistant shares the same context serializer
- [x] Android Agent model exposes equivalent context scopes
- [x] No database migration required
- [x] Contract tests added

## Gates
- [ ] Web Quality green
- [ ] Mobile Typecheck green
- [ ] Edition 10 merged to `main`
- [ ] PR retargeted to `main`
- [ ] PR merged
- [ ] `agent-run` redeployed
- [ ] `scheduled-agent-runs` redeployed
- [ ] Manual Agent smoke test confirms context-aware response
- [ ] Scheduled Agent smoke test confirms same context boundary

## Release truth
Edition 11 is repository-complete when code/tests are green. It is production-active only after the two Edge Functions above are redeployed from the merged commit. A Vercel build-rate limit is unrelated to this server runtime gate and must not block the next ordered edition.
