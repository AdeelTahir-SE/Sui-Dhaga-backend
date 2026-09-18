-- Fix handle_new_user trigger function for Google OAuth & external providers
-- Supabase PostgreSQL Migration: 003_fix_handle_new_user_google_oauth.sql

-- Replace handle_new_user() with robust metadata parsing, enum validation, picture fallback, and duplicate key protection
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  resolved_role public.user_role := 'customer';
  raw_role text;
  resolved_avatar text;
  resolved_name text;
  resolved_phone text;
begin
  -- 1. Safely resolve user role, defaulting to 'customer'
  raw_role := lower(trim(coalesce(new.raw_user_meta_data->>'role', 'customer')));
  if raw_role = 'tailor' then
    resolved_role := 'tailor'::public.user_role;
  elsif raw_role = 'admin' then
    resolved_role := 'admin'::public.user_role;
  else
    resolved_role := 'customer'::public.user_role;
  end if;

  -- 2. Safely resolve name (supports Google 'full_name' or 'name' or email username)
  resolved_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'User'
  );

  -- 3. Safely resolve avatar (Google sends 'picture', Supabase/custom sends 'avatar_url')
  resolved_avatar := coalesce(
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data->>'picture'), '')
  );

  -- 4. Safely resolve phone
  resolved_phone := coalesce(
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    nullif(trim(new.raw_user_meta_data->>'phone_number'), ''),
    nullif(trim(new.phone), '')
  );

  -- 5. Insert profile with ON CONFLICT DO UPDATE so duplicate keys never crash auth signup
  insert into public.profiles (
    id,
    role,
    status,
    full_name,
    phone,
    avatar_url,
    updated_at
  )
  values (
    new.id,
    resolved_role,
    'active',
    resolved_name,
    resolved_phone,
    resolved_avatar,
    now()
  )
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    phone = coalesce(public.profiles.phone, excluded.phone),
    updated_at = now();

  return new;
exception when others then
  -- Fail-safe: ensure trigger never blocks or aborts auth.users signup
  return new;
end;
$$;

-- Ensure trigger is connected to auth.users after insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
