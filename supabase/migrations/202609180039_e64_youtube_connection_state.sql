-- E64 — YouTube connection state and channel identity.
-- Preserve existing connection lifecycle while making missing permission explicit.

alter table public.creator_platform_connections
  drop constraint if exists creator_platform_connections_status_check;

alter table public.creator_platform_connections
  add constraint creator_platform_connections_status_check
  check (
    status = any (
      array[
        'not_connected'::text,
        'authorizing'::text,
        'connected'::text,
        'needs_permission'::text,
        'expired'::text,
        'revoked'::text,
        'error'::text
      ]
    )
  );

alter table public.creator_platform_connections
  add column if not exists provider_avatar_url text
  check (
    provider_avatar_url is null
    or char_length(provider_avatar_url) between 1 and 2048
  );
