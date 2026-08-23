alter table public.ai_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-attachments', 'ai-attachments', false, 6291456,
        array['image/jpeg','image/png','image/webp','text/plain'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "AI attachment owners can insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'ai-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "AI attachment owners can read"
on storage.objects for select to authenticated
using (bucket_id = 'ai-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "AI attachment owners can delete"
on storage.objects for delete to authenticated
using (bucket_id = 'ai-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
