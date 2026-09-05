-- Row Level Security (RLS) Policies for Sui Dhaga Database
-- Supabase PostgreSQL

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.tailors enable row level security;
alter table public.tailor_gallery enable row level security;
alter table public.tailor_services enable row level security;
alter table public.tailor_availability enable row level security;
alter table public.measurements enable row level security;
alter table public.designs enable row level security;
alter table public.fabrics enable row level security;
alter table public.appointments enable row level security;
alter table public.orders enable row level security;
alter table public.order_tracking enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_saves enable row level security;
alter table public.reports enable row level security;

-- Helper function to check if user is admin
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- ============================================================================
-- 2. TAILORS, SERVICES, AVAILABILITY, GALLERY
-- ============================================================================
create policy "Tailors are viewable by everyone" on public.tailors
  for select using (true);

create policy "Tailors can insert their own profile" on public.tailors
  for insert with check (auth.uid() = user_id or public.is_admin());

create policy "Tailors can update their own profile" on public.tailors
  for update using (auth.uid() = user_id or public.is_admin());

create policy "Tailors can delete their own profile" on public.tailors
  for delete using (auth.uid() = user_id or public.is_admin());

-- Gallery
create policy "Gallery is viewable by everyone" on public.tailor_gallery
  for select using (true);

create policy "Tailors can manage gallery images" on public.tailor_gallery
  for all using (
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or public.is_admin()
  );

-- Tailor Services
create policy "Tailor services are viewable by everyone" on public.tailor_services
  for select using (true);

create policy "Tailors can manage their services" on public.tailor_services
  for all using (
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or public.is_admin()
  );

-- Tailor Availability
create policy "Tailor availability is viewable by everyone" on public.tailor_availability
  for select using (true);

create policy "Tailors can manage their availability" on public.tailor_availability
  for all using (
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or public.is_admin()
  );

-- ============================================================================
-- 3. MEASUREMENTS
-- ============================================================================
create policy "Users manage their own measurements" on public.measurements
  for all using (auth.uid() = user_id or public.is_admin());

-- ============================================================================
-- 4. DESIGNS
-- ============================================================================
create policy "Users can view public or own designs or shared designs" on public.designs
  for select using (
    auth.uid() = user_id or
    public.is_admin() or
    exists (select 1 from public.tailors where id = shared_with_tailor_id and user_id = auth.uid())
  );

create policy "Users can manage their own designs" on public.designs
  for all using (auth.uid() = user_id or public.is_admin());

-- ============================================================================
-- 5. FABRICS
-- ============================================================================
create policy "Fabrics are viewable by everyone" on public.fabrics
  for select using (true);

create policy "Authenticated users or admins can manage fabrics" on public.fabrics
  for all using (auth.uid() is not null);

-- ============================================================================
-- 6. APPOINTMENTS
-- ============================================================================
create policy "Appointments viewable by involved customer or tailor or admin" on public.appointments
  for select using (
    customer_id = auth.uid() or
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or
    public.is_admin()
  );

create policy "Customers can create appointments" on public.appointments
  for insert with check (customer_id = auth.uid() or public.is_admin());

create policy "Involved parties can update appointments" on public.appointments
  for update using (
    customer_id = auth.uid() or
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or
    public.is_admin()
  );

create policy "Involved parties can delete appointments" on public.appointments
  for delete using (
    customer_id = auth.uid() or
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or
    public.is_admin()
  );

-- ============================================================================
-- 7. ORDERS & ORDER TRACKING
-- ============================================================================
create policy "Orders viewable by customer, tailor, or admin" on public.orders
  for select using (
    customer_id = auth.uid() or
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or
    public.is_admin()
  );

create policy "Customers can create orders" on public.orders
  for insert with check (customer_id = auth.uid() or public.is_admin());

create policy "Involved parties can update orders" on public.orders
  for update using (
    customer_id = auth.uid() or
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or
    public.is_admin()
  );

-- Tracking
create policy "Order tracking viewable by customer, tailor, or admin" on public.order_tracking
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (
        o.customer_id = auth.uid() or
        exists (select 1 from public.tailors t where t.id = o.tailor_id and t.user_id = auth.uid()) or
        public.is_admin()
      )
    )
  );

create policy "Tailors or admins can add tracking events" on public.order_tracking
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (
        exists (select 1 from public.tailors t where t.id = o.tailor_id and t.user_id = auth.uid()) or
        public.is_admin()
      )
    )
  );

create policy "Tailors or admins can update tracking events" on public.order_tracking
  for update using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (
        exists (select 1 from public.tailors t where t.id = o.tailor_id and t.user_id = auth.uid()) or
        public.is_admin()
      )
    )
  );

-- ============================================================================
-- 8. CONVERSATIONS & MESSAGES
-- ============================================================================
create policy "Participants can view conversations" on public.conversations
  for select using (participant1_id = auth.uid() or participant2_id = auth.uid() or public.is_admin());

create policy "Participants can create conversations" on public.conversations
  for insert with check (participant1_id = auth.uid() or participant2_id = auth.uid() or public.is_admin());

create policy "Participants can update conversations" on public.conversations
  for update using (participant1_id = auth.uid() or participant2_id = auth.uid() or public.is_admin());

create policy "Conversation participants can view messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.participant1_id = auth.uid() or c.participant2_id = auth.uid())
    ) or public.is_admin()
  );

create policy "Conversation participants can send messages" on public.messages
  for insert with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.participant1_id = auth.uid() or c.participant2_id = auth.uid())
    )
  );

create policy "Participants can update messages" on public.messages
  for update using (
    sender_id = auth.uid() or
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.participant1_id = auth.uid() or c.participant2_id = auth.uid())
    ) or public.is_admin()
  );

-- ============================================================================
-- 9. REVIEWS
-- ============================================================================
create policy "Reviews are viewable by everyone" on public.reviews
  for select using (true);

create policy "Customers can create reviews" on public.reviews
  for insert with check (customer_id = auth.uid() or public.is_admin());

create policy "Customers can update their own reviews" on public.reviews
  for update using (customer_id = auth.uid() or public.is_admin());

create policy "Customers or admins can delete reviews" on public.reviews
  for delete using (customer_id = auth.uid() or public.is_admin());

-- ============================================================================
-- 10. WISHLIST
-- ============================================================================
create policy "Users manage their own wishlist items" on public.wishlist_items
  for all using (auth.uid() = user_id or public.is_admin());

-- ============================================================================
-- 11. PAYMENTS
-- ============================================================================
create policy "Users can view their own payments or admins" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());

create policy "Users or system can insert payments" on public.payments
  for insert with check (user_id = auth.uid() or public.is_admin());

create policy "Users or admins can update payments" on public.payments
  for update using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- 12. NOTIFICATIONS
-- ============================================================================
create policy "Users can view and manage their own notifications" on public.notifications
  for all using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- 13. COMMUNITY (Posts, Comments, Likes, Saves)
-- ============================================================================
create policy "Community posts are viewable by everyone" on public.community_posts
  for select using (true);

create policy "Users can insert community posts" on public.community_posts
  for insert with check (user_id = auth.uid() or public.is_admin());

create policy "Users can update their own posts" on public.community_posts
  for update using (user_id = auth.uid() or public.is_admin());

create policy "Users can delete their own posts or admin" on public.community_posts
  for delete using (user_id = auth.uid() or public.is_admin());

-- Comments
create policy "Community comments are viewable by everyone" on public.community_comments
  for select using (true);

create policy "Users can insert community comments" on public.community_comments
  for insert with check (user_id = auth.uid() or public.is_admin());

create policy "Users can update their own comments" on public.community_comments
  for update using (user_id = auth.uid() or public.is_admin());

create policy "Users can delete their own comments or admin" on public.community_comments
  for delete using (user_id = auth.uid() or public.is_admin());

-- Likes & Saves
create policy "Likes and Saves viewable by everyone" on public.community_likes
  for select using (true);

create policy "Users manage their own likes" on public.community_likes
  for all using (user_id = auth.uid());

create policy "Saves viewable by owner" on public.community_saves
  for select using (user_id = auth.uid() or public.is_admin());

create policy "Users manage their own saves" on public.community_saves
  for all using (user_id = auth.uid());

-- ============================================================================
-- 14. REPORTS
-- ============================================================================
create policy "Users can create reports" on public.reports
  for insert with check (reporter_id = auth.uid() or public.is_admin());

create policy "Admins can view and manage reports" on public.reports
  for all using (public.is_admin());

