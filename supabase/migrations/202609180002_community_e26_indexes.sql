-- E26 — Squad foreign-key index hardening
create index if not exists squads_owner_id_idx
  on public.squads(owner_id);

create index if not exists squad_invites_invited_by_idx
  on public.squad_invites(invited_by);

create index if not exists squad_invites_accepted_by_idx
  on public.squad_invites(accepted_by)
  where accepted_by is not null;
