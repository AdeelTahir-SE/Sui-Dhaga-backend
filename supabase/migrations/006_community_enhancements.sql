-- ============================================================================
-- 006_community_enhancements.sql
-- Add category and comments_count to community_posts and auto-count trigger
-- ============================================================================

-- 1. Add category column if not exists
alter table public.community_posts
add column if not exists category text;

-- 2. Add comments_count column if not exists
alter table public.community_posts
add column if not exists comments_count integer not null default 0;

-- 3. Create index for category filtering
create index if not exists idx_community_posts_category on public.community_posts (category);

-- 4. Function to automatically synchronize comments_count on community_posts
create or replace function public.sync_community_comments_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.community_posts
    set comments_count = (
      select count(*) from public.community_comments where post_id = NEW.post_id
    )
    where id = NEW.post_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.community_posts
    set comments_count = (
      select count(*) from public.community_comments where post_id = OLD.post_id
    )
    where id = OLD.post_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- 5. Trigger on community_comments to keep comments_count up to date
drop trigger if exists tr_sync_community_comments_count on public.community_comments;
create trigger tr_sync_community_comments_count
after insert or delete on public.community_comments
for each row execute function public.sync_community_comments_count();

-- 6. Recalculate existing comments_count if any
update public.community_posts p
set comments_count = (
  select count(*) from public.community_comments c where c.post_id = p.id
);
