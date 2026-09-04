# NXR-037D Creator Intelligence

## Truth and normalized boundary

Only authorized, provider-returned observations cross `CreatorAnalyticsProvider`. All normalized metrics are optional. A returned zero is retained; a missing field remains absent. Provider/account/content IDs, capture/source timestamps, granted metric names, country period, and payload fingerprint preserve provenance. Global benchmarks and personal observations are never blended.

Derived weekday and two-hour posting-window analysis describes **historical content performance**, not audience-online activity. A window needs at least five comparable posts. Confidence is deterministic: sample contribution `min(45, n×2)`, recency `max(0, 20−ageDays/4.5)`, consistency `max(0, 20×(1−min(1, coefficientOfVariation)))`, and provider completeness `15×clamp(completeness)`. Fewer than five samples is `insufficient`; otherwise scores below 50 are `low`, 50–74.99 `medium`, and 75+ `high`.

## Provider readiness (documentation audit attempted 2026-09-04)

The environment could not authenticate its documentation search, so no integration is represented as externally complete. Before deployment, re-audit the linked official contracts and update adapters if they changed.

| Provider  | Code                                                      | External state                                                                 | Contract represented                                                                                                                    |
| --------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| YouTube   | OAuth/state/PKCE, identity and read boundary prepared     | `CONFIG_REQUIRED`; Google OAuth consent/configuration may require verification | Minimum read-only scopes: `youtube.readonly`, `yt-analytics.readonly`; country/day/video Analytics dimensions; no hourly audience claim |
| TikTok    | Login/OAuth, identity and video counter boundary prepared | `APP_REVIEW_REQUIRED` and `CONFIG_REQUIRED`                                    | `user.info.basic`, `video.list`; views/likes/comments/shares only                                                                       |
| Instagram | Connection is deliberately unavailable                    | `APP_REVIEW_REQUIRED` and `CONFIG_REQUIRED`                                    | Professional account and a verified current Meta contract required; no personal-account support claimed                                 |

Official references to verify: Google [OAuth scopes](https://developers.google.com/identity/protocols/oauth2/scopes#youtube), [YouTube Analytics dimensions](https://developers.google.com/youtube/analytics/dimensions), and [metrics](https://developers.google.com/youtube/analytics/metrics); TikTok [Login Kit](https://developers.tiktok.com/doc/login-kit-web), [scopes](https://developers.tiktok.com/doc/tiktok-api-scopes), and [Display API](https://developers.tiktok.com/doc/display-api-overview); Meta [Instagram Platform](https://developers.facebook.com/docs/instagram-platform/).

## Security, lifecycle, and retention

The mobile app receives only a short-lived authorization URL and safe connection metadata. Exchange and identity verification happen in Edge Functions. State is single-use and expires after ten minutes; callback inputs are bounded; redirects require an exact allowlist; PKCE is used. AES-256-GCM ciphertext is held in an RLS table with no client policy. Tokens are neither returned nor logged.

Connections move through `not_connected`, `authorizing`, `connected`, `expired`, `revoked`, and `error`. Only verified exchange + identity + canonical persistence produces `connected`. Server throttling sets the next allowed attempt. Safe error codes replace raw provider errors. Disconnect deletes credentials, marks the connection revoked, stops sync, and retains analytics; explicit delete cascades connection metadata, credentials, snapshots, content and country observations.

No benchmark rows ship in this revision. The validator requires source name/HTTPS reference, publication date, collection period, platform/region, methodology, metric/window, limitations and dataset version.

## Deployment intentionally pending

After migration review and provider configuration:

```sh
supabase db push
supabase functions deploy creator-oauth-start
supabase functions deploy creator-oauth-callback --no-verify-jwt
supabase functions deploy creator-analytics-sync
supabase secrets set CREATOR_TOKEN_ENCRYPTION_KEY='<base64-32-bytes>' CREATOR_OAUTH_REDIRECT_ALLOWLIST='<exact-uri-list>' CREATOR_SYNC_SCHEDULER_SECRET='<random>' YOUTUBE_CLIENT_ID='<id>' YOUTUBE_CLIENT_SECRET='<secret>' TIKTOK_CLIENT_KEY='<key>' TIKTOK_CLIENT_SECRET='<secret>'
```

The migration and functions were not deployed. NXR-037C blockers (tus-js-client, expo-video, expo-file-system, expo-sharing, Docker/FFmpeg runtimes, `OPENAI_API_KEY`, migration deployment and worker deployment) remain for the final Terminal/Supabase phase.
