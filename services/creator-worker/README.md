# KIVRYN Creator Worker

Persistent external worker for private Creator media. It atomically claims PostgreSQL jobs, downloads an owner-scoped source, validates it with `ffprobe`, extracts speech audio, calls the configured OpenAI transcription API, derives real scene/speech candidates and deterministic scores, renders with FFmpeg, uploads private outputs, and persists the resulting clips.

## Runtime truth

The process is long-running. It registers a server-owned heartbeat in `creator_worker_instances` and exposes `GET /healthz` on the platform-provided `PORT`.

A deployment is healthy only after the worker can write its heartbeat to Supabase. The endpoint returns:

- `200` when the runtime is alive and the database heartbeat is fresh.
- `503` while starting, stopping, or when the runtime has not established a recent database heartbeat.

The KIVRYN Web/Android Creator surfaces use the authenticated `creator-worker-status` Edge Function rather than calling the worker directly.

## Railway deployment

Use a persistent Railway service connected to the `mrdigitalvip-maker/mindshare-os` GitHub repository.

Service settings:

- **Root Directory:** `services/creator-worker`
- **Builder:** Dockerfile (the `Dockerfile` in this directory is auto-detected)
- **Healthcheck Path:** `/healthz`
- **Restart policy:** always/on failure for this long-running worker
- **Branch:** `main` after the E69/E70 PR is merged
- **No public business API is required.** Public networking is only needed if Railway requires it for HTTP healthchecks in the selected service configuration.

Required secrets/variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Optional tuning:

- `TRANSCRIPTION_MODEL`
- `WORKER_ID`
- `POLL_INTERVAL_MS`
- `LEASE_SECONDS`
- `MAX_ATTEMPTS`
- `WORKER_HEARTBEAT_MS`

Railway injects `PORT` automatically. Railway-provided deployment/commit/region identifiers are consumed when present and are written only to the server-owned health ledger.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` to Web/Android.

## Local build

`OPENAI_API_KEY` is mandatory for transcription; without it the job truthfully fails with `TRANSCRIPTION_PROVIDER_NOT_CONFIGURED`.

Build from this service directory:

```sh
docker build -t kivryn-creator-worker .
```

The process handles SIGTERM/SIGINT, heartbeats its lease and runtime presence, checks cancellation between stages, and deletes each temporary workspace in `finally`.
