# Phase 1 video test report — 2026-09-17

Source: production screen recording made on 2026-09-17 around 12:48 America/Bahia, using a non-Premium test account.

## Passed in the recording
- Home loaded and the tester accepted the current layout.
- Assistant accepted and processed a simple message.
- Project creation flow produced successful creation feedback.
- Tasks/Productivity loaded without a confirmed blocking failure during the sampled flow.
- Studies opened correctly; Start Study / Iniciar registro / Concluir sessão worked.
- Challenges confirmation eventually completed; no persistent reproducible blocker was established from the recording.
- Premium surface was accepted for the current phase.
- Settings language switch to Portuguese worked.
- Notification settings and test notification worked.

## Confirmed blockers found and corrected
### Project row did not open
The existing project row could be tapped repeatedly without opening its workspace in the tested mobile browser/WebView flow.

Correction: the entire project row is now a real button that uses explicit TanStack Router navigation to `/projects/$projectId`, with focus/ARIA handling.

### Journey Pack “Ver Pack” did not open
The Pack detail action could be tapped repeatedly without navigating.

Correction: the action now uses an explicit button + router navigation to `/packs/$slug`.

### E17 Documents caused Agent run persistence failures
A real scheduled Agent run after the prior deployment failed with `persistence_error`. E17 added the `documents` context scope and `workspace.documents` connector, while `agent_runs` CHECK constraints still accepted only the older values.

Correction: production constraints now accept `documents` and `workspace.documents`, restoring coherence between E17 context grounding and E18 observability persistence.

### Documents existed but was not discoverable as a release module
The route and implementation existed, but Documents was not release-ready in the module registry and was absent from the execution navigation. Search results can also be filtered by release modules.

Correction: Documents is now release-ready and present in the execution navigation.

### Internal SECURITY DEFINER helpers inherited excessive client EXECUTE grants
Several internal helpers were callable by client roles through inherited/default grants even though they are server/trigger implementation details.

Correction: client execution was revoked from internal helpers and anonymous execution was removed from authenticated application RPCs while preserving authenticated/service-role access as appropriate.

## Intentionally carried into Phase 2
These were not treated as tiny E20 hotfixes because they are product/design or larger backend work:
- Creator Studio creator-first redesign and progressive disclosure.
- Real URL-to-video import pipeline before exposing “paste link → generate clips” as functional.
- Real-data Creator analytics charts; no fake chart data.
- Community onboarding/profile redesign, optional own squad creation and plan-aware free/premium official communities.
- Arena visual redesign.
- Full Premium Agent manual/scheduled runtime validation from a Premium account.
- Full Creator and Community runtime paths that were not exercised in this recording.

## Release rule
This work closes confirmed Phase 1 blockers from the recording and hardens the preflight. It does not itself implement Edition 21.
