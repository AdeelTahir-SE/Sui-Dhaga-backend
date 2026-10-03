-- Migration: 007_postgis_nearby_tailors.sql
-- Enables PostGIS and implements high-performance nearest tailors discovery

-- 1. Enable PostGIS Extension in extensions schema (standard for Supabase)
create extension if not exists postgis with schema extensions;

-- Ensure extensions is in search path
set search_path to public, extensions;

-- 2. Add location geography column if not exists
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tailors'
      and column_name = 'location'
  ) then
    alter table public.tailors
    add column location extensions.geography(Point, 4326);
  end if;
end $$;

-- 3. Populate geography location for existing rows with valid coordinates
update public.tailors
set location = extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
where latitude is not null
  and longitude is not null
  and location is null;

-- 4. Spatial GiST index for fast proximity lookups (bounding-box / KNN)
create index if not exists idx_tailors_location_gist
on public.tailors using gist (location);

-- 5. Trigger function to auto-update 'location' whenever latitude/longitude changes
create or replace function public.sync_tailor_location()
returns trigger as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := extensions.st_setsrid(
      extensions.st_makepoint(new.longitude, new.latitude),
      4326
    )::extensions.geography;
  else
    new.location := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_tailor_location on public.tailors;
create trigger trg_sync_tailor_location
before insert or update of latitude, longitude on public.tailors
for each row execute function public.sync_tailor_location();

-- 6. RPC Function: get_nearby_tailors
-- Fast geodetic distance calculation, index-based radius filtering, and sorting
create or replace function public.get_nearby_tailors(
  user_lat double precision,
  user_lng double precision,
  max_distance_meters double precision default 50000,
  p_limit integer default 20,
  p_offset integer default 0,
  p_city text default null,
  p_min_rating numeric default null,
  p_search text default null
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
    to_jsonb(p) as profile
  from public.tailors t
  left join public.profiles p on p.id = t.user_id
  where t.location is not null
    and extensions.st_dwithin(t.location, user_geo, max_distance_meters)
    and (p_city is null or lower(t.city) = lower(p_city))
    and (p_min_rating is null or t.rating >= p_min_rating)
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

-- Grant permissions for RPC function
grant execute on function public.get_nearby_tailors to anon, authenticated, service_role;
