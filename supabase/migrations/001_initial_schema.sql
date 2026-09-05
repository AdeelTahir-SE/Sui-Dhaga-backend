-- Sui Dhaga Relational Database Schema
-- Supabase PostgreSQL Migration: 001_initial_schema.sql

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

do $$ begin
  create type public.user_role as enum ('customer', 'tailor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('active', 'blocked', 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tailor_verification_status as enum ('pending', 'verified', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_status as enum ('pending', 'confirmed', 'rescheduled', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.measurement_unit as enum ('in', 'cm');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.design_type as enum ('text-to-design', 'image-to-design', 'sketch-to-design', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_provider as enum ('stripe', 'safepay');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 1. PROFILES (Extends Supabase auth.users)
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'customer',
  status public.account_status not null default 'active',
  full_name text,
  phone text,
  address text,
  bio text,
  avatar_url text,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_status on public.profiles (status);

-- ============================================================================
-- 2. TAILORS & TAILOR ASSETS
-- ============================================================================

create table if not exists public.tailors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  shop_name text not null,
  specialties text[] not null default '{}',
  city text not null,
  address text,
  experience_years integer not null default 0,
  bio text,
  rating numeric(3,2) not null default 0.00,
  review_count integer not null default 0,
  verification_status public.tailor_verification_status not null default 'pending',
  verified boolean not null default false,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tailors_user_id on public.tailors (user_id);
create index if not exists idx_tailors_city on public.tailors (city);
create index if not exists idx_tailors_verified on public.tailors (verified);
create index if not exists idx_tailors_verification_status on public.tailors (verification_status);
create index if not exists idx_tailors_rating on public.tailors (rating desc);

create table if not exists public.tailor_gallery (
  id uuid primary key default gen_random_uuid(),
  tailor_id uuid not null references public.tailors(id) on delete cascade,
  image_url text not null,
  caption text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_tailor_gallery_tailor_id on public.tailor_gallery (tailor_id);

create table if not exists public.tailor_services (
  id uuid primary key default gen_random_uuid(),
  tailor_id uuid not null references public.tailors(id) on delete cascade,
  title text not null,
  price numeric(10,2) not null default 0.00,
  description text,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tailor_services_tailor_id on public.tailor_services (tailor_id);
create index if not exists idx_tailor_services_category on public.tailor_services (category);

create table if not exists public.tailor_availability (
  id uuid primary key default gen_random_uuid(),
  tailor_id uuid not null references public.tailors(id) on delete cascade,
  day_of_week text not null,
  start_time text not null,
  end_time text not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tailor_availability_tailor_id on public.tailor_availability (tailor_id);
create index if not exists idx_tailor_availability_day on public.tailor_availability (tailor_id, day_of_week);

-- ============================================================================
-- 3. MEASUREMENTS
-- ============================================================================

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  unit public.measurement_unit not null default 'in',
  chest numeric(5,2),
  waist numeric(5,2),
  hips numeric(5,2),
  shoulder numeric(5,2),
  sleeve_length numeric(5,2),
  inseam numeric(5,2),
  neck numeric(5,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_measurements_user_id on public.measurements (user_id);

-- ============================================================================
-- 4. DESIGNS (AI & Custom Studio)
-- ============================================================================

create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  description text,
  type public.design_type not null default 'text-to-design',
  prompt text,
  enhanced_prompt text,
  image_url text,
  original_image_url text,
  sketch_url text,
  colors text[] not null default '{}',
  fabric text,
  embroidery text,
  measurements jsonb not null default '{}'::jsonb,
  notes text,
  model_used text,
  status text not null default 'completed',
  shared_with_tailor_id uuid references public.tailors(id) on delete set null,
  duplicated_from_id uuid references public.designs(id) on delete set null,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_designs_user_id on public.designs (user_id);
create index if not exists idx_designs_type on public.designs (type);
create index if not exists idx_designs_shared on public.designs (shared_with_tailor_id);

-- ============================================================================
-- 5. FABRICS
-- ============================================================================

create table if not exists public.fabrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  material text not null,
  price_per_meter numeric(10,2) not null default 0.00,
  color text,
  pattern text,
  image_url text,
  in_stock boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fabrics_in_stock on public.fabrics (in_stock);

-- ============================================================================
-- 6. APPOINTMENTS
-- ============================================================================

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  tailor_id uuid not null references public.tailors(id) on delete cascade,
  service_id uuid references public.tailor_services(id) on delete set null,
  appointment_date text not null,
  appointment_time text not null,
  notes text,
  status public.appointment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_customer on public.appointments (customer_id);
create index if not exists idx_appointments_tailor on public.appointments (tailor_id);
create index if not exists idx_appointments_status on public.appointments (status);
create index if not exists idx_appointments_date on public.appointments (appointment_date);

-- ============================================================================
-- 7. ORDERS & ORDER TRACKING
-- ============================================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  tailor_id uuid not null references public.tailors(id) on delete cascade,
  service_id uuid references public.tailor_services(id) on delete set null,
  design_id uuid references public.designs(id) on delete set null,
  measurement_id uuid references public.measurements(id) on delete set null,
  total_amount numeric(10,2) not null default 0.00,
  notes text,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_customer on public.orders (customer_id);
create index if not exists idx_orders_tailor on public.orders (tailor_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_created on public.orders (created_at desc);

create table if not exists public.order_tracking (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  description text,
  location text,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_tracking_order_id on public.order_tracking (order_id, created_at asc);

-- ============================================================================
-- 8. CONVERSATIONS & MESSAGES
-- ============================================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant1_id uuid not null references public.profiles(id) on delete cascade,
  participant2_id uuid not null references public.profiles(id) on delete cascade,
  last_message text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_distinct_participants check (participant1_id <> participant2_id)
);

create index if not exists idx_conversations_p1 on public.conversations (participant1_id);
create index if not exists idx_conversations_p2 on public.conversations (participant2_id);
create index if not exists idx_conversations_last_msg on public.conversations (last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  attachments text[] not null default '{}',
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages (conversation_id, created_at asc);
create index if not exists idx_messages_sender on public.messages (sender_id);
create index if not exists idx_messages_is_read on public.messages (is_read);

-- ============================================================================
-- 9. REVIEWS & RATINGS
-- ============================================================================

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  tailor_id uuid not null references public.tailors(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reviews_tailor on public.reviews (tailor_id);
create index if not exists idx_reviews_customer on public.reviews (customer_id);
create index if not exists idx_reviews_order on public.reviews (order_id);

-- ============================================================================
-- 10. WISHLIST
-- ============================================================================

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('tailor', 'design')),
  tailor_id uuid references public.tailors(id) on delete cascade,
  design_id uuid references public.designs(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint chk_wishlist_item check (
    (item_type = 'tailor' and tailor_id is not null) or
    (item_type = 'design' and design_id is not null)
  )
);

create index if not exists idx_wishlist_user on public.wishlist_items (user_id);
create index if not exists idx_wishlist_tailor on public.wishlist_items (tailor_id);
create index if not exists idx_wishlist_design on public.wishlist_items (design_id);

-- ============================================================================
-- 11. PAYMENTS
-- ============================================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'PKR',
  provider public.payment_provider not null default 'stripe',
  status text not null default 'pending_checkout',
  transaction_id text,
  webhook_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_order on public.payments (order_id);
create index if not exists idx_payments_user on public.payments (user_id);
create index if not exists idx_payments_status on public.payments (status);
create index if not exists idx_payments_transaction on public.payments (transaction_id);

-- ============================================================================
-- 12. NOTIFICATIONS
-- ============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  read_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications (user_id, is_read);

-- ============================================================================
-- 13. COMMUNITY (Posts, Comments, Likes, Saves)
-- ============================================================================

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  images text[] not null default '{}',
  tags text[] not null default '{}',
  likes_count integer not null default 0,
  saves_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_posts_user on public.community_posts (user_id);
create index if not exists idx_community_posts_created on public.community_posts (created_at desc);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_comments_post on public.community_comments (post_id, created_at asc);
create index if not exists idx_community_comments_user on public.community_comments (user_id);

create table if not exists public.community_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_saves (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ============================================================================
-- 14. REPORTS & MODERATION
-- ============================================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reports_status on public.reports (status);

-- ============================================================================
-- 15. TRIGGERS & AUTOMATION
-- ============================================================================

-- Function to update updated_at timestamp automatically
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at triggers
drop trigger if exists tr_profiles_updated_at on public.profiles;
create trigger tr_profiles_updated_at before update on public.profiles for each row execute procedure public.update_updated_at_column();

drop trigger if exists tr_tailors_updated_at on public.tailors;
create trigger tr_tailors_updated_at before update on public.tailors for each row execute procedure public.update_updated_at_column();

drop trigger if exists tr_tailor_services_updated_at on public.tailor_services;
create trigger tr_tailor_services_updated_at before update on public.tailor_services for each row execute procedure public.update_updated_at_column();

drop trigger if exists tr_tailor_availability_updated_at on public.tailor_availability;
create trigger tr_tailor_availability_updated_at before update on public.tailor_availability for each row execute procedure public.update_updated_at_column();

drop trigger if exists tr_measurements_updated_at on public.measurements;
create trigger tr_measurements_updated_at before update on public.measurements for each row execute procedure public.update_updated_at_column();

drop trigger if exists tr_designs_updated_at on public.designs;
create trigger tr_designs_updated_at before update on public.designs for each row execute procedure public.update_updated_at_column();

drop trigger if exists tr_fabrics_updated_at on public.fabrics;
create trigger tr_fabrics_updated_at before update on public.fabrics for each row execute procedure public.update_updated_at_column();

drop trigger if exists tr_appointments_updated_at on public.appointments;
create trigger tr_appointments_updated_at before update on public.appointments for each row execute procedure public.update_updated_at_column();

drop trigger if exists tr_orders_updated_at on public.orders;
create trigger tr_orders_updated_at before update on public.orders for each row execute procedure public.update_updated_at_column();

drop trigger if exists tr_conversations_updated_at on public.conversations;
create trigger tr_conversations_updated_at before update on public.conversations for each row execute procedure public.update_updated_at_column();

drop trigger if exists tr_reviews_updated_at on public.reviews;
create trigger tr_reviews_updated_at before update on public.reviews for each row execute procedure public.update_updated_at_column();

drop trigger if exists tr_payments_updated_at on public.payments;
create trigger tr_payments_updated_at before update on public.payments for each row execute procedure public.update_updated_at_column();

drop trigger if exists tr_community_posts_updated_at on public.community_posts;
create trigger tr_community_posts_updated_at before update on public.community_posts for each row execute procedure public.update_updated_at_column();

drop trigger if exists tr_community_comments_updated_at on public.community_comments;
create trigger tr_community_comments_updated_at before update on public.community_comments for each row execute procedure public.update_updated_at_column();

-- Function & Trigger: Automatic profile creation on auth.users signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, avatar_url)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'customer'),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
