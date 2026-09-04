# NEXORA Creator Worker

Stateless external worker for private Creator media. It atomically claims PostgreSQL jobs, downloads an owner-scoped source, validates it with `ffprobe`, extracts speech audio, calls the configured OpenAI transcription API, derives real scene/speech candidates and deterministic scores, renders with FFmpeg, then uploads private outputs and persists rows.

Copy `.env.example` into the deployment secret manager. `OPENAI_API_KEY` is mandatory for transcription; without it the job truthfully fails with `TRANSCRIPTION_PROVIDER_NOT_CONFIGURED`. Build with `docker build -t nexora-creator-worker services/creator-worker`. Apply the migration before starting the worker. The process handles SIGTERM, heartbeats its lease, checks cancellation between stages, and deletes each temporary workspace in `finally`.
