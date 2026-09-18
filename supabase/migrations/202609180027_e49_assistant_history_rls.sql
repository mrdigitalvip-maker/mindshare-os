-- E49 — Assistant conversation/message RLS initplan hardening.
-- Preserve public ALL owner semantics. Existing indexes already cover
-- ai_conversations.user_id and ai_messages.conversation_id.

drop policy if exists conversation_all on public.ai_conversations;
create policy conversation_all
on public.ai_conversations
for all
to public
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists messages_all on public.ai_messages;
create policy messages_all
on public.ai_messages
for all
to public
using (
  exists (
    select 1
    from public.ai_conversations c
    where c.id = ai_messages.conversation_id
      and c.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.ai_conversations c
    where c.id = ai_messages.conversation_id
      and c.user_id = (select auth.uid())
  )
);
