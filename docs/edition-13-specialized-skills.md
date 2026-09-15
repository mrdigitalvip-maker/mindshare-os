# KIVRYN Edition 13 — Agents → Specialized Skills

## Goal
Turn the existing Agent `capabilities` compatibility field into KIVRYN-owned, versioned specialist behavior without introducing connectors, subagents, a second Agent runtime, or the final OpenAI Agentic Integration.

## Skill registry
Edition 13 introduces a server-side registry with five v1 skills:

- `writing.v1` — Writing Specialist
- `planning.v1` — Planning Specialist
- `summarization.v1` — Summarization Specialist
- `study.v1` — Study Coach
- `productivity.v1` — Productivity Operator

Existing Agents keep their stored capability IDs (`writing`, `planning`, `summarization`, `study`, `productivity`). At execution time KIVRYN resolves those compatibility IDs into the exact skill versions above. No migration of existing Agent rows is required.

## Authority boundary
A skill defines specialist method, readable context scopes, and the maximum Action Layer domains associated with the skill. A skill never grants mutation approval.

- Writing/Summarization: profile + preferences only; no mutation domain.
- Planning/Productivity: profile + preferences + Tasks + Projects; Action Layer domain remains Tasks/Projects and still requires explicit approval.
- Study: profile + preferences + Studies + Passport; Action Layer domain remains Studies and still requires explicit approval.

Unknown capability values are ignored. The model cannot invent a new skill, connector, subagent, tool, context scope, or action authority.

## Execution
The existing shared `executeAgentRun` remains the only manual/background Agent executor. It now:

1. resolves the Agent's stored capabilities;
2. resolves the matching KIVRYN skill definitions;
3. loads the already-authorized Personal Context Engine scopes;
4. persists `skill_ids` and `skill_registry_version` on `agent_runs`;
5. injects the bounded skill registry payload into the system prompt;
6. preserves the existing Action Layer approval boundary and Background Runs retry lifecycle.

## Product surfaces
Web and Android expose the same five specialist names. The Web Agent builder now presents them as specialized skills instead of generic capability labels. Existing Agents automatically display the matching skill names with no user migration.

## Production activation
After Editions 9–12 are merged in order and Edition 13 reaches `main`:

1. apply `20260915141000_agent_specialized_skills.sql` to the verified KIVRYN production Supabase project;
2. redeploy `agent-run`;
3. redeploy `scheduled-agent-runs` because scheduled runs share the same executor;
4. smoke-test one manual Agent and one scheduled Agent, confirming persisted skill IDs and unchanged workspace approval behavior.

## Explicitly deferred
- connectors
- subagents
- external tool registry
- Computer Use
- final OpenAI Agentic Integration

Those remain later ordered Agentic Core work.
