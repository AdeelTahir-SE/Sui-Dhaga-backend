-- Migration: 008_notifications_enhancements.sql
-- Description: Adds push_token to profiles and ensures notifications table has proper index and realtime support

-- 1. Add push_token column to profiles table
alter table public.profiles add column if not exists push_token text;

-- 2. Ensure indexes on notifications table
create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread_user on public.notifications (user_id, is_read);
create index if not exists idx_notifications_type on public.notifications (type);

-- 3. Enable supabase_realtime publication for notifications table
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when others then
      null;
    end;
  end if;
end $$;
