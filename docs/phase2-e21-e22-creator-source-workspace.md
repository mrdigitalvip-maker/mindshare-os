# Phase 2 — E21 + E22 Creator source workspace

## E21 — Creator Studio redesign

The Creator surface is now source-first instead of form-first.

- The first actionable workspace is video source ingestion.
- Source, processing and real clip counts are shown from persisted Creator resources.
- KIVI no longer renders as an interactive fixed overlay over Creator content.
- Creator Copilot is an in-flow workspace card.
- Profile, strategy/goals, manual analytics and Academy remain available through progressive disclosure instead of competing with the primary creation flow.
- Real clip output remains backed by `creator_clips`; no demonstration clips or scores are created.
- Provider-verified charts stay deferred to E24 until evidence exists.

## E22 — Real URL ingestion

E22 reuses the existing canonical Creator pipeline rather than creating a second clipping engine.

### Direct authorized video URL

`creator-source-import` accepts a user-confirmed, public HTTPS direct video URL and:

1. authenticates the KIVRYN user;
2. requires explicit rights/permission confirmation;
3. rejects unsafe/private hosts and unsupported redirects;
4. accepts only supported video MIME types with a known bounded size;
5. streams the source into the private `creator-sources` bucket without buffering the full video in Edge memory;
6. persists a real `creator_projects` row using `authorized_direct`;
7. marks the source available only after Storage succeeds;
8. calls the existing `enqueue_creator_job` RPC;
9. leaves analysis/transcription/clip selection/rendering to the existing external Creator worker.

The persisted source reference strips URL query parameters so signed/query credentials are not stored in Creator project metadata.

### YouTube URL

YouTube remains truthful:

- the existing authenticated `creator-youtube-metadata` function uses the official YouTube Data API for metadata;
- it returns `downloadAvailable: false` and `originalUploadRequired: true`;
- the UI therefore asks for the original video file before clipping instead of presenting a fake download/import path.

## Compatibility

No new public database tables or enums are required for E21/E22. Existing Phase 1 Creator schema already supports `authorized_direct`, `url_metadata`, private source storage, canonical jobs and real clips.

No Android AAB/build work is part of this pair.
