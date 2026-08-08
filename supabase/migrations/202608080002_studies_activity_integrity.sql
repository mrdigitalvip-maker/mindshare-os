-- Keeps study workspaces chronologically reliable without adding duplicate tables.
-- Existing orphan goals must be repaired explicitly instead of being attached to
-- an arbitrary subject.
do $$
begin
  if exists (select 1 from public.study_goals where subject_id is null) then
    raise exception 'study_goals contains rows without subject_id; repair them before applying this migration';
  end if;
end $$;

alter table public.study_goals alter column subject_id set not null;

create or replace function public.touch_study_subject() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  target_subject uuid := coalesce(new.subject_id, old.subject_id);
begin
  update public.study_subjects
    set updated_at = now()
    where id = target_subject and user_id = auth.uid();
  return coalesce(new, old);
end $$;

revoke all on function public.touch_study_subject() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['study_sessions','study_goals','study_notes'] loop
    execute format('drop trigger if exists touch_study_subject on public.%I', table_name);
    execute format(
      'create trigger touch_study_subject after insert or update or delete on public.%I for each row execute function public.touch_study_subject()',
      table_name
    );
  end loop;
end $$;

drop trigger if exists study_subjects_set_updated_at on public.study_subjects;
create trigger study_subjects_set_updated_at before update on public.study_subjects
for each row execute function public.set_updated_at();

