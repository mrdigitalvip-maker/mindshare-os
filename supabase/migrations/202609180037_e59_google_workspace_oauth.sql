-- E59 — Google Workspace providers on the shared external connection vault.
-- Extend existing provider constraints without introducing a second credential store.

alter table public.creator_platform_connections
  drop constraint if exists creator_platform_connections_platform_check;

alter table public.creator_platform_connections
  add constraint creator_platform_connections_platform_check
  check (
    platform = any (
      array[
        'youtube'::text,
        'tiktok'::text,
        'instagram'::text,
        'gmail'::text,
        'google_calendar'::text,
        'google_drive'::text
      ]
    )
  );

alter table public.creator_oauth_states
  drop constraint if exists creator_oauth_states_provider_check;

alter table public.creator_oauth_states
  add constraint creator_oauth_states_provider_check
  check (
    provider = any (
      array[
        'youtube'::text,
        'tiktok'::text,
        'instagram'::text,
        'gmail'::text,
        'google_calendar'::text,
        'google_drive'::text
      ]
    )
  );
