create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer', 'tailor', 'admin');
create type public.account_status as enum ('active', 'blocked', 'deleted');
create type public.tailor_verification_status as enum ('pending', 'verified', 'rejected', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'customer',
  status public.account_status not null default 'active',
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A flexible, auditable resource store keeps every API module Supabase-first while
-- allowing feature fields to evolve without unsafe client-defined SQL.
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  owner_id uuid references auth.users(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index resources_type_created_idx on public.resources (resource_type, created_at desc);
create index resources_owner_idx on public.resources (owner_id);

alter table public.profiles enable row level security;
alter table public.resources enable row level security;

create policy "profiles readable by authenticated users" on public.profiles for select to authenticated using (true);
create policy "users update their own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "resources publicly readable where applicable" on public.resources for select using (true);
create policy "authenticated users create resources" on public.resources for insert to authenticated with check (owner_id = auth.uid());
create policy "owners manage resources" on public.resources for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'customer'));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
