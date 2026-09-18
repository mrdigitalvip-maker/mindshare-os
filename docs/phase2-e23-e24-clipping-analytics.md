# Phase 2 — E23 + E24 Creator clipping and verified analytics

## E23 — Clipping workflow

E23 completes the existing Creator video engine on Web instead of creating a second pipeline.

- Source ingestion continues to enqueue the canonical `creator_jobs` workflow.
- The external Creator worker remains the only heavy-media executor: ffprobe, scene analysis, OpenAI transcription, candidate scoring, diversification, FFmpeg rendering and private output upload.
- Web now exposes real job stage, attempts and safe error code from persisted rows.
- Active jobs can be cancelled only after an explicit second confirmation.
- Real clips expose persisted score reason, transcript excerpt, duration, aspect ratio and render version.
- Rerender reuses `enqueue_creator_rerender`; start/end, aspect ratio and caption choice are explicit user inputs.
- Downloads continue through short-lived signed URLs from the private `creator-outputs` bucket.
- No sample/demo clips or simulated processing state are introduced.

## E24 — Provider-verified Creator analytics

E24 turns the existing OAuth + analytics schema into an evidence-backed flow.

- YouTube discovers the authenticated channel, its uploads playlist and video metadata through the official Data API.
- YouTube Analytics is queried for provider-returned per-video metrics over a bounded recent period. Data API lifetime statistics remain valid provider evidence when Analytics reporting is temporarily unavailable; Analytics-only fields remain absent in that case.
- TikTok reads only fields returned by the authorized Display API `/v2/video/list/` endpoint.
- Missing metrics remain missing. Provider-returned zero remains zero.
- Normalized provider content is upserted into `creator_analytics_content`.
- Metric observations are append-only in `creator_analytics_snapshots` and deduplicated by a SHA-256 fingerprint of normalized provider evidence and period.
- `granted_metrics` is populated only after successful provider evidence is observed; OAuth connection alone does not claim metric availability.
- Provider credentials remain server-only and encrypted.
- Web shows explicit connection state, explicit sync, two-step disconnect, verified content performance and empty states instead of fabricated chart data.
- Manual analytics remain a separate, visibly labeled source.

## Compatibility and release boundary

This pair does not add navigation, does not create a new Creator module, and does not change Android build/release behavior.

No Android AAB is generated. E23/E24 remain Web-first and reuse existing Creator tables, RPCs, Storage buckets, OAuth functions and worker deployment.
