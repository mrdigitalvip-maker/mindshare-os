-- E64 — Creator provider connection presentation metadata.
-- Persist only provider-approved public account presentation data; tokens stay server-only.

alter table public.creator_platform_connections
  add column if not exists provider_avatar_url text
  check (
    provider_avatar_url is null
    or (
      char_length(provider_avatar_url) between 1 and 2048
      and provider_avatar_url ~ '^https://'
    )
  );
