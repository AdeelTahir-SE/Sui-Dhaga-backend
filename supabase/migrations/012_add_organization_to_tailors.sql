-- Migration: 012_add_organization_to_tailors.sql
-- Add organization_name column to tailors table and update discovery RPC

-- 1. Add organization_name column to public.tailors
alter table public.tailors
add column if not exists organization_name text;

-- 2. Create index on organization_name for fast lookups
create index if not exists idx_tailors_organization_name
on public.tailors (lower(organization_name));

-- 3. Update get_nearby_tailors RPC function to include organization_name
drop function if exists public.get_nearby_tailors(double precision, double precision, double precision, integer, integer, text, numeric, text);
drop function if exists public.get_nearby_tailors(double precision, double precision, double precision, integer, integer, text, numeric, text, text);

create or replace function public.get_nearby_tailors(
  user_lat double precision,
  user_lng double precision,
  max_distance_meters double precision default 50000,
  p_limit integer default 20,
  p_offset integer default 0,
  p_city text default null,
  p_min_rating numeric default null,
  p_search text default null,
  p_organization text default null
)
returns table (
  id uuid,
  user_id uuid,
  shop_name text,
  specialties text[],
  city text,
  address text,
  experience_years integer,
  bio text,
  rating numeric,
  review_count integer,
  banner_url text,
  verified boolean,
  verification_status public.tailor_verification_status,
  latitude double precision,
  longitude double precision,
  distance_meters double precision,
  organization_name text,
  profile jsonb
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  user_geo extensions.geography;
begin
  user_geo := extensions.st_setsrid(extensions.st_makepoint(user_lng, user_lat), 4326)::extensions.geography;

  return query
  select
    t.id,
    t.user_id,
    t.shop_name,
    t.specialties,
    t.city,
    t.address,
    t.experience_years,
    t.bio,
    t.rating,
    t.review_count,
    t.banner_url,
    t.verified,
    t.verification_status,
    t.latitude,
    t.longitude,
    extensions.st_distance(t.location, user_geo) as distance_meters,
    t.organization_name,
    to_jsonb(p) as profile
  from public.tailors t
  left join public.profiles p on p.id = t.user_id
  where t.location is not null
    and extensions.st_dwithin(t.location, user_geo, max_distance_meters)
    and (p_city is null or lower(t.city) = lower(p_city))
    and (p_min_rating is null or t.rating >= p_min_rating)
    and (p_organization is null or lower(t.organization_name) = lower(p_organization))
    and (
      p_search is null
      or t.shop_name ilike ('%' || p_search || '%')
      or t.address ilike ('%' || p_search || '%')
      or t.city ilike ('%' || p_search || '%')
      or array_to_string(t.specialties, ' ') ilike ('%' || p_search || '%')
    )
  order by distance_meters asc
  limit p_limit
  offset p_offset;
end;
$$;

grant execute on function public.get_nearby_tailors to anon, authenticated, service_role;
