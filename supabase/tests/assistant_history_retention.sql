-- Run with `supabase test db`. This test is transactional and uses pgTAP.
begin;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'retention-' || n || '@example.test', '', now()
from generate_series(1, 6) n;

create temporary table retention_users as
select id, row_number() over (order by email) n from auth.users where email like 'retention-%@example.test';

insert into public.ai_conversations (id, user_id, title, created_at, updated_at)
select gen_random_uuid(), id, 'fixture', now() - case n when 1 then interval '29 days' else interval '31 days' end,
       now() - case n when 1 then interval '29 days' else interval '31 days' end from retention_users;
insert into public.ai_messages (conversation_id, role, content, created_at)
select c.id, 'user', 'fixture', c.created_at from public.ai_conversations c join retention_users u on u.id = c.user_id;

insert into public.subscriptions (user_id, status, current_period_end)
select id, 'active', now() + interval '1 day' from retention_users where n = 3
union all select id, 'trialing', now() + interval '1 day' from retention_users where n = 4
union all select id, 'active', now() - interval '1 day' from retention_users where n = 5;

select * from public.purge_expired_ai_history(30);

select is((select count(*)::int from public.ai_conversations c join retention_users u on u.id=c.user_id where u.n=1), 1, 'Free history at 29 days remains');
select is((select count(*)::int from public.ai_conversations c join retention_users u on u.id=c.user_id where u.n=2), 0, 'Free history at 31 days is deleted');
select is((select count(*)::int from public.ai_conversations c join retention_users u on u.id=c.user_id where u.n=3), 1, 'Active Premium remains');
select is((select count(*)::int from public.ai_conversations c join retention_users u on u.id=c.user_id where u.n=4), 1, 'Trialing Premium remains');
select is((select count(*)::int from public.ai_conversations c join retention_users u on u.id=c.user_id where u.n=5), 0, 'Expired Premium is deleted');
select is((select count(*)::int from public.ai_conversations c join retention_users u on u.id=c.user_id where u.n=6), 0, 'User without subscription is deleted');
select is((select count(*)::int from public.ai_messages m join public.ai_conversations c on c.id=m.conversation_id join retention_users u on u.id=c.user_id where u.n=1), 1, 'Retained conversation keeps messages');
select is((select count(*)::int from public.ai_messages m where m.content='fixture'), 3, 'Deleted conversations remove only their own messages');

select * from finish();
rollback;
