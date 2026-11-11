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

-- Helper function to check if user is admin (security definer with fixed search_path)
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id or public.is_admin());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- ============================================================================
-- 2. TAILORS, SERVICES, AVAILABILITY, GALLERY
-- ============================================================================
drop policy if exists "Tailors are viewable by everyone" on public.tailors;
create policy "Tailors are viewable by everyone" on public.tailors
  for select using (true);

drop policy if exists "Tailors can insert their own profile" on public.tailors;
create policy "Tailors can insert their own profile" on public.tailors
  for insert with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Tailors can update their own profile" on public.tailors;
create policy "Tailors can update their own profile" on public.tailors
  for update using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Tailors can delete their own profile" on public.tailors;
create policy "Tailors can delete their own profile" on public.tailors
  for delete using (auth.uid() = user_id or public.is_admin());

-- Gallery
drop policy if exists "Gallery is viewable by everyone" on public.tailor_gallery;
create policy "Gallery is viewable by everyone" on public.tailor_gallery
  for select using (true);

drop policy if exists "Tailors can manage gallery images" on public.tailor_gallery;
create policy "Tailors can manage gallery images" on public.tailor_gallery
  for all using (
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or public.is_admin()
  );

-- Tailor Services
drop policy if exists "Tailor services are viewable by everyone" on public.tailor_services;
create policy "Tailor services are viewable by everyone" on public.tailor_services
  for select using (true);

drop policy if exists "Tailors can manage their services" on public.tailor_services;
create policy "Tailors can manage their services" on public.tailor_services
  for all using (
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or public.is_admin()
  );

-- Tailor Availability
drop policy if exists "Tailor availability is viewable by everyone" on public.tailor_availability;
create policy "Tailor availability is viewable by everyone" on public.tailor_availability
  for select using (true);

drop policy if exists "Tailors can manage their availability" on public.tailor_availability;
create policy "Tailors can manage their availability" on public.tailor_availability
  for all using (
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or public.is_admin()
  );

-- ============================================================================
-- 3. MEASUREMENTS
-- ============================================================================
drop policy if exists "Users manage their own measurements" on public.measurements;
create policy "Users manage their own measurements" on public.measurements
  for all using (auth.uid() = user_id or public.is_admin());

-- ============================================================================
-- 4. DESIGNS
-- ============================================================================
drop policy if exists "Users can view public or own designs or shared designs" on public.designs;
create policy "Users can view public or own designs or shared designs" on public.designs
  for select using (
    auth.uid() = user_id or
    public.is_admin() or
    exists (select 1 from public.tailors where id = shared_with_tailor_id and user_id = auth.uid())
  );

drop policy if exists "Users can manage their own designs" on public.designs;
create policy "Users can manage their own designs" on public.designs
  for all using (auth.uid() = user_id or public.is_admin());

-- ============================================================================
-- 5. FABRICS
-- ============================================================================
drop policy if exists "Fabrics are viewable by everyone" on public.fabrics;
create policy "Fabrics are viewable by everyone" on public.fabrics
  for select using (true);

drop policy if exists "Authenticated users or admins can manage fabrics" on public.fabrics;
create policy "Authenticated users or admins can manage fabrics" on public.fabrics
  for all using (auth.uid() is not null);

-- ============================================================================
-- 6. APPOINTMENTS
-- ============================================================================
drop policy if exists "Appointments viewable by involved customer or tailor or admin" on public.appointments;
create policy "Appointments viewable by involved customer or tailor or admin" on public.appointments
  for select using (
    customer_id = auth.uid() or
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or
    public.is_admin()
  );

drop policy if exists "Customers can create appointments" on public.appointments;
create policy "Customers can create appointments" on public.appointments
  for insert with check (customer_id = auth.uid() or public.is_admin());

drop policy if exists "Involved parties can update appointments" on public.appointments;
create policy "Involved parties can update appointments" on public.appointments
  for update using (
    customer_id = auth.uid() or
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or
    public.is_admin()
  );

drop policy if exists "Involved parties can delete appointments" on public.appointments;
create policy "Involved parties can delete appointments" on public.appointments
  for delete using (
    customer_id = auth.uid() or
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or
    public.is_admin()
  );

-- ============================================================================
-- 7. ORDERS & ORDER TRACKING
-- ============================================================================
drop policy if exists "Orders viewable by customer, tailor, or admin" on public.orders;
create policy "Orders viewable by customer, tailor, or admin" on public.orders
  for select using (
    customer_id = auth.uid() or
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or
    public.is_admin()
  );

drop policy if exists "Customers can create orders" on public.orders;
create policy "Customers can create orders" on public.orders
  for insert with check (customer_id = auth.uid() or public.is_admin());

drop policy if exists "Involved parties can update orders" on public.orders;
create policy "Involved parties can update orders" on public.orders
  for update using (
    customer_id = auth.uid() or
    exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or
    public.is_admin()
  );

-- Tracking
drop policy if exists "Order tracking viewable by customer, tailor, or admin" on public.order_tracking;
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

drop policy if exists "Tailors or admins can add tracking events" on public.order_tracking;
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

drop policy if exists "Tailors or admins can update tracking events" on public.order_tracking;
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
drop policy if exists "Participants can view conversations" on public.conversations;
create policy "Participants can view conversations" on public.conversations
  for select using (participant1_id = auth.uid() or participant2_id = auth.uid() or public.is_admin());

drop policy if exists "Participants can create conversations" on public.conversations;
create policy "Participants can create conversations" on public.conversations
  for insert with check (participant1_id = auth.uid() or participant2_id = auth.uid() or public.is_admin());

drop policy if exists "Participants can update conversations" on public.conversations;
create policy "Participants can update conversations" on public.conversations
  for update using (participant1_id = auth.uid() or participant2_id = auth.uid() or public.is_admin());

drop policy if exists "Conversation participants can view messages" on public.messages;
create policy "Conversation participants can view messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.participant1_id = auth.uid() or c.participant2_id = auth.uid())
    ) or public.is_admin()
  );

drop policy if exists "Conversation participants can send messages" on public.messages;
create policy "Conversation participants can send messages" on public.messages
  for insert with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.participant1_id = auth.uid() or c.participant2_id = auth.uid())
    )
  );

drop policy if exists "Participants can update messages" on public.messages;
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
drop policy if exists "Reviews are viewable by everyone" on public.reviews;
create policy "Reviews are viewable by everyone" on public.reviews
  for select using (true);

drop policy if exists "Customers can create reviews" on public.reviews;
create policy "Customers can create reviews" on public.reviews
  for insert with check (customer_id = auth.uid() or public.is_admin());

drop policy if exists "Customers can update their own reviews" on public.reviews;
create policy "Customers can update their own reviews" on public.reviews
  for update using (customer_id = auth.uid() or public.is_admin());

drop policy if exists "Customers or admins can delete reviews" on public.reviews;
create policy "Customers or admins can delete reviews" on public.reviews
  for delete using (customer_id = auth.uid() or public.is_admin());

-- ============================================================================
-- 10. WISHLIST
-- ============================================================================
drop policy if exists "Users manage their own wishlist items" on public.wishlist_items;
create policy "Users manage their own wishlist items" on public.wishlist_items
  for all using (auth.uid() = user_id or public.is_admin());

-- ============================================================================
-- 11. PAYMENTS
-- ============================================================================
drop policy if exists "Users can view their own payments or admins" on public.payments;
create policy "Users can view their own payments or admins" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users or system can insert payments" on public.payments;
create policy "Users or system can insert payments" on public.payments
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users or admins can update payments" on public.payments;
create policy "Users or admins can update payments" on public.payments
  for update using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- 12. NOTIFICATIONS
-- ============================================================================
drop policy if exists "Users can view and manage their own notifications" on public.notifications;
create policy "Users can view and manage their own notifications" on public.notifications
  for all using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- 13. COMMUNITY (Posts, Comments, Likes, Saves)
-- ============================================================================
drop policy if exists "Community posts are viewable by everyone" on public.community_posts;
create policy "Community posts are viewable by everyone" on public.community_posts
  for select using (true);

drop policy if exists "Users can insert community posts" on public.community_posts;
create policy "Users can insert community posts" on public.community_posts
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can update their own posts" on public.community_posts;
create policy "Users can update their own posts" on public.community_posts
  for update using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can delete their own posts or admin" on public.community_posts;
create policy "Users can delete their own posts or admin" on public.community_posts
  for delete using (user_id = auth.uid() or public.is_admin());

-- Comments
drop policy if exists "Community comments are viewable by everyone" on public.community_comments;
create policy "Community comments are viewable by everyone" on public.community_comments
  for select using (true);

drop policy if exists "Users can insert community comments" on public.community_comments;
create policy "Users can insert community comments" on public.community_comments
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can update their own comments" on public.community_comments;
create policy "Users can update their own comments" on public.community_comments
  for update using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can delete their own comments or admin" on public.community_comments;
create policy "Users can delete their own comments or admin" on public.community_comments
  for delete using (user_id = auth.uid() or public.is_admin());

-- Likes & Saves
drop policy if exists "Likes and Saves viewable by everyone" on public.community_likes;
create policy "Likes and Saves viewable by everyone" on public.community_likes
  for select using (true);

drop policy if exists "Users manage their own likes" on public.community_likes;
create policy "Users manage their own likes" on public.community_likes
  for all using (user_id = auth.uid());

drop policy if exists "Saves viewable by owner" on public.community_saves;
create policy "Saves viewable by owner" on public.community_saves
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users manage their own saves" on public.community_saves;
create policy "Users manage their own saves" on public.community_saves
  for all using (user_id = auth.uid());

-- ============================================================================
-- 14. REPORTS
-- ============================================================================
drop policy if exists "Users can create reports" on public.reports;
create policy "Users can create reports" on public.reports
  for insert with check (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can view and manage reports" on public.reports;
create policy "Admins can view and manage reports" on public.reports
  for all using (public.is_admin());


-- ============================================================================
-- 15. EXTENDED PLATFORM TABLES (Migration 014)
-- ============================================================================
alter table public.design_templates enable row level security;
alter table public.tailor_blocked_dates enable row level security;
alter table public.tailor_payout_settings enable row level security;
alter table public.tailor_payouts enable row level security;
alter table public.addresses enable row level security;
alter table public.payment_methods enable row level security;
alter table public.coupons enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.user_follows enable row level security;
alter table public.disputes enable row level security;
alter table public.cms_content enable row level security;
alter table public.platform_settings enable row level security;
alter table public.contact_messages enable row level security;
alter table public.blog_posts enable row level security;

drop policy if exists "Design templates viewable by everyone" on public.design_templates;
create policy "Design templates viewable by everyone" on public.design_templates
  for select using (is_active = true or public.is_admin());
drop policy if exists "Admins manage design templates" on public.design_templates;
create policy "Admins manage design templates" on public.design_templates
  for all using (public.is_admin());

drop policy if exists "Blocked dates viewable by everyone" on public.tailor_blocked_dates;
create policy "Blocked dates viewable by everyone" on public.tailor_blocked_dates
  for select using (true);
drop policy if exists "Tailors manage their blocked dates" on public.tailor_blocked_dates;
create policy "Tailors manage their blocked dates" on public.tailor_blocked_dates
  for all using (exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or public.is_admin());

drop policy if exists "Tailors manage their payout settings" on public.tailor_payout_settings;
create policy "Tailors manage their payout settings" on public.tailor_payout_settings
  for all using (exists (select 1 from public.tailors where id = tailor_id and user_id = auth.uid()) or public.is_admin());

drop policy if exists "Tailors view and request their payouts" on public.tailor_payouts;
create policy "Tailors view and request their payouts" on public.tailor_payouts
  for all using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users manage their own addresses" on public.addresses;
create policy "Users manage their own addresses" on public.addresses
  for all using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users manage their own payment methods" on public.payment_methods;
create policy "Users manage their own payment methods" on public.payment_methods
  for all using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Active coupons readable by authenticated" on public.coupons;
create policy "Active coupons readable by authenticated" on public.coupons
  for select using (is_active = true or public.is_admin());
drop policy if exists "Admins manage coupons" on public.coupons;
create policy "Admins manage coupons" on public.coupons
  for all using (public.is_admin());

drop policy if exists "Subscription plans viewable by everyone" on public.subscription_plans;
create policy "Subscription plans viewable by everyone" on public.subscription_plans
  for select using (is_active = true or public.is_admin());
drop policy if exists "Admins manage subscription plans" on public.subscription_plans;
create policy "Admins manage subscription plans" on public.subscription_plans
  for all using (public.is_admin());

drop policy if exists "Users view and manage their subscriptions" on public.user_subscriptions;
create policy "Users view and manage their subscriptions" on public.user_subscriptions
  for all using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Follows viewable by everyone" on public.user_follows;
create policy "Follows viewable by everyone" on public.user_follows
  for select using (true);
drop policy if exists "Users manage their own follows" on public.user_follows;
create policy "Users manage their own follows" on public.user_follows
  for all using (follower_id = auth.uid() or public.is_admin());

drop policy if exists "Users view own disputes" on public.disputes;
create policy "Users view own disputes" on public.disputes
  for select using (raised_by = auth.uid() or against_user_id = auth.uid() or public.is_admin());
drop policy if exists "Users create disputes" on public.disputes;
create policy "Users create disputes" on public.disputes
  for insert with check (raised_by = auth.uid() or public.is_admin());
drop policy if exists "Admins manage disputes" on public.disputes;
create policy "Admins manage disputes" on public.disputes
  for all using (public.is_admin());

drop policy if exists "Published CMS readable by everyone" on public.cms_content;
create policy "Published CMS readable by everyone" on public.cms_content
  for select using (is_published = true or public.is_admin());
drop policy if exists "Admins manage CMS" on public.cms_content;
create policy "Admins manage CMS" on public.cms_content
  for all using (public.is_admin());

drop policy if exists "Admins manage platform settings" on public.platform_settings;
create policy "Admins manage platform settings" on public.platform_settings
  for all using (public.is_admin());

drop policy if exists "Anyone can submit contact messages" on public.contact_messages;
create policy "Anyone can submit contact messages" on public.contact_messages
  for insert with check (true);
drop policy if exists "Admins manage contact messages" on public.contact_messages;
create policy "Admins manage contact messages" on public.contact_messages
  for all using (public.is_admin());

drop policy if exists "Published blog posts viewable by everyone" on public.blog_posts;
create policy "Published blog posts viewable by everyone" on public.blog_posts
  for select using (is_published = true or public.is_admin());
drop policy if exists "Admins manage blog posts" on public.blog_posts;
create policy "Admins manage blog posts" on public.blog_posts
  for all using (public.is_admin());
