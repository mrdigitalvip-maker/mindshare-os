-- Make user-facing diagnostic references directly retrievable by operators.
alter table public.runtime_errors
  add column if not exists reference text;

update public.runtime_errors
set reference = context ->> 'reference'
where reference is null and context ->> 'reference' is not null;

create unique index if not exists runtime_errors_reference_idx
  on public.runtime_errors (reference)
  where reference is not null;
