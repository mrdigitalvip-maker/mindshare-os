-- E33 — Journey Pack catalog RPC security hardening.
-- Catalog remains available to signed-in users, but no longer executes as definer
-- and is not callable by anon.

create or replace function public.get_journey_packs()
returns setof public.journey_packs
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select p.*
  from public.journey_packs p
  where p.status='published'
  order by p.category,p.title;
$$;

create or replace function public.get_journey_pack_detail(p_slug text)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'pack',to_jsonb(p),
    'steps',coalesce(
      (
        select jsonb_agg(to_jsonb(s) order by s.sequence)
        from public.journey_pack_steps s
        where s.pack_id=p.id
      ),
      '[]'::jsonb
    )
  )
  from public.journey_packs p
  where p.slug=p_slug
    and p.status='published'
  order by p.version desc
  limit 1;
$$;

revoke select on table public.journey_packs, public.journey_pack_steps from anon;
grant select on table public.journey_packs, public.journey_pack_steps to authenticated;

revoke all on function public.get_journey_packs() from public, anon;
grant execute on function public.get_journey_packs() to authenticated;

revoke all on function public.get_journey_pack_detail(text) from public, anon;
grant execute on function public.get_journey_pack_detail(text) to authenticated;
