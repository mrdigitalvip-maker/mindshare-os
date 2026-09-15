# Edition 13 release checklist

## Repository gates
- [ ] Web Quality green
- [ ] Mobile Typecheck green
- [ ] Edition 13 contract tests green
- [ ] PR mergeable after Edition 12 reaches `main`

## Backend activation
- [ ] Apply `20260915141000_agent_specialized_skills.sql`
- [ ] Redeploy `agent-run`
- [ ] Redeploy `scheduled-agent-runs`

## Smoke verification
- [ ] Existing Agent with `planning` resolves `planning.v1`
- [ ] Existing Agent with `study` resolves `study.v1`
- [ ] Manual run persists `skill_ids` and registry version
- [ ] Scheduled run persists the same skill versions
- [ ] Unknown capability does not create a skill
- [ ] Skills do not bypass Action Layer approval
- [ ] Web and Android display matching specialist names

## Deferred by design
Connectors, subagents, external tools and final OpenAI Agentic Integration are not part of Edition 13.
