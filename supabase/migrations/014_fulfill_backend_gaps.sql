-- ============================================================================
-- Sui Dhaga Migration: 014_fulfill_backend_gaps.sql
-- Fulfills all backend integration gaps across Designs, Tailors, Reviews,
-- Customer Account/Checkout/Payments, Coupons, Subscriptions, Wishlist,
-- Community Follow/Visibility, Admin Portal, Contact, Fabrics, and Blog.
-- ============================================================================

-- ============================================================================
-- 1. DESIGNS ENHANCEMENTS & DESIGN TEMPLATES
-- ============================================================================

ALTER TABLE IF EXISTS public.designs
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_trashed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trashed_at timestamptz,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS style text,
  ADD COLUMN IF NOT EXISTS occasion text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS chat_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_designs_user_favorite ON public.designs (user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_designs_user_trashed ON public.designs (user_id, is_trashed);

CREATE TABLE IF NOT EXISTS public.design_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  occasion text,
  style text,
  type public.design_type NOT NULL DEFAULT 'text-to-design',
  prompt text NOT NULL,
  image_url text,
  colors text[] NOT NULL DEFAULT '{}',
  fabric text,
  embroidery text,
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  popularity integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_templates_category ON public.design_templates (category);
CREATE INDEX IF NOT EXISTS idx_design_templates_active ON public.design_templates (is_active, popularity DESC);

INSERT INTO public.design_templates (slug, title, description, category, occasion, style, type, prompt, colors, fabric, embroidery, tags, popularity)
VALUES
  (
    'royal-crimson-bridal-lehenga',
    'Royal Crimson Bridal Lehenga',
    'Traditional hand-embellished bridal lehenga choli with intricate zardozi and dabka borders.',
    'Bridal',
    'Wedding',
    'Traditional Heritage',
    'text-to-design',
    'Royal crimson velvet bridal lehenga choli with antique gold zardozi, dabka embroidery, scalloped organza dupatta, Pakistani couture catalog shot',
    ARRAY['#8B0000', '#D4AF37', '#FDF5E6'],
    'Pure Silk Velvet & Organza',
    'Zardozi, Dabka & Resham',
    ARRAY['bridal', 'lehenga', 'zardozi', 'wedding'],
    100
  ),
  (
    'ivory-jamawar-groom-sherwani',
    'Ivory Jamawar Groom Sherwani',
    'Structured ivory self-jamawar sherwani paired with antique brass buttons and subtle collar embroidery.',
    'Menswear',
    'Nikah / Barat',
    'Classic Regal',
    'text-to-design',
    'Ivory Banarsi jamawar groom sherwani with mandarin collar, minimal gold tilla motif on cuff and collar, tailored fit, studio fashion photography',
    ARRAY['#FFFFF0', '#C5A059', '#2C2C2C'],
    'Banarsi Jamawar',
    'Minimal Tilla & Dabka Collar',
    ARRAY['sherwani', 'groom', 'menswear', 'nikah'],
    95
  ),
  (
    'emerald-anarkali-festive-gown',
    'Emerald Silk Anarkali Gown',
    'Floor-length flared Anarkali silhouette in emerald raw silk with gota patti and mirror accents.',
    'Festive',
    'Mehndi / Eid',
    'Regal Flare',
    'text-to-design',
    'Emerald green raw silk floor-length Anarkali dress with delicate gold gota patti hemline and sheer organza dupatta, luxury South Asian couture',
    ARRAY['#046307', '#E6BE8A', '#F4F1EA'],
    'Pure Raw Silk',
    'Gota Patti & Sequins',
    ARRAY['anarkali', 'festive', 'eid', 'raw-silk'],
    90
  ),
  (
    'charcoal-bespoke-three-piece-suit',
    'Charcoal Bespoke Three-Piece Suit',
    'Sharp Savile-inspired three-piece tailored wool suit with peak lapels and horn buttons.',
    'Formal',
    'Business / Reception',
    'Modern Tailored',
    'text-to-design',
    'Charcoal grey bespoke three-piece wool suit with sharp peak lapels, structured shoulders, waistcoat, crisp white shirt, editorial studio lighting',
    ARRAY['#36454F', '#FFFFFF', '#1C1C1C'],
    'Super 120s Italian Wool',
    'None (Hand-stitched Pick Stitching)',
    ARRAY['suit', 'formal', 'menswear', 'bespoke'],
    88
  ),
  (
    'pastel-rose-chikankari-kurta',
    'Pastel Rose Chikankari Kurta Set',
    'Breathable summer cotton lawn kurta featuring delicate tone-on-tone chikankari and pearl buttons.',
    'Casual',
    'Daywear / Eid',
    'Minimalist Craft',
    'text-to-design',
    'Blush pastel rose pure cotton lawn tailored kurta shalwar with delicate white chikankari embroidery on placket and sleeves, natural editorial daylight',
    ARRAY['#F4C2C2', '#FFF8F0', '#E8D5C4'],
    'Swiss Voile Cotton Lawn',
    'Tone-on-Tone Chikankari',
    ARRAY['kurta', 'casual', 'lawn', 'chikankari'],
    85
  ),
  (
    'champagne-gharara-walima-ensemble',
    'Champagne Tissue Gharara Set',
    'Luminous champagne gold tissue short kurti paired with wide-flared pleated gharara.',
    'Bridal',
    'Walima / Engagement',
    'Contemporary Couture',
    'text-to-design',
    'Champagne gold crushed tissue short kurti with pearl and crystal handwork paired with wide flared pleated gharara, soft luxury lighting',
    ARRAY['#F7E7CE', '#D4AF37', '#FAF9F6'],
    'Crushed Tissue & Katan Silk',
    'Pearls, Cutdana & Mukesh',
    ARRAY['gharara', 'walima', 'tissue', 'bridal'],
    82
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. TAILORS & REVIEWS ENHANCEMENTS (Featured, Blocked Dates, Payouts, Replies)
-- ============================================================================

ALTER TABLE IF EXISTS public.tailors
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tailors_is_featured ON public.tailors (is_featured);

ALTER TABLE IF EXISTS public.reviews
  ADD COLUMN IF NOT EXISTS tailor_reply text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderation_note text,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status ON public.reviews (moderation_status);

CREATE TABLE IF NOT EXISTS public.tailor_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id uuid NOT NULL REFERENCES public.tailors(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_tailor_blocked_date UNIQUE (tailor_id, blocked_date)
);

CREATE INDEX IF NOT EXISTS idx_tailor_blocked_dates_tailor ON public.tailor_blocked_dates (tailor_id, blocked_date);

CREATE TABLE IF NOT EXISTS public.tailor_payout_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id uuid NOT NULL REFERENCES public.tailors(id) ON DELETE CASCADE UNIQUE,
  method text NOT NULL DEFAULT 'bank_transfer',
  bank_name text,
  account_title text,
  account_number text,
  iban text,
  wallet_provider text,
  wallet_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tailor_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id uuid NOT NULL REFERENCES public.tailors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'PKR',
  method text NOT NULL DEFAULT 'bank_transfer',
  account_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')),
  transaction_ref text,
  notes text,
  admin_notes text,
  processed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tailor_payouts_tailor ON public.tailor_payouts (tailor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tailor_payouts_status ON public.tailor_payouts (status);

-- ============================================================================
-- 3. CUSTOMER ACCOUNT, CHECKOUT, PAYMENTS, COUPONS, SUBSCRIPTIONS & WISHLIST
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  full_name text NOT NULL,
  phone text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'Pakistan',
  is_default boolean NOT NULL DEFAULT false,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses (user_id, is_default DESC);

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('card', 'jazzcash', 'easypaisa', 'sadapay', 'nayapay', 'bank_account', 'cod')),
  provider text NOT NULL,
  label text,
  brand text,
  last4 text,
  expiry_month integer,
  expiry_year integer,
  holder_name text,
  wallet_number text,
  account_title text,
  bank_name text,
  provider_payment_method_id text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON public.payment_methods (user_id, is_default DESC);

-- Convert payments.provider from strict enum to text so JazzCash / EasyPaisa / SadaPay / COD are supported seamlessly
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'provider' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE public.payments ALTER COLUMN provider DROP DEFAULT;
    ALTER TABLE public.payments ALTER COLUMN provider TYPE text USING provider::text;
    ALTER TABLE public.payments ALTER COLUMN provider SET DEFAULT 'stripe';
  END IF;
END $$;

ALTER TABLE IF EXISTS public.payments
  ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS address_id uuid REFERENCES public.addresses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount numeric(10,2) NOT NULL DEFAULT 0,
  max_discount_amount numeric(10,2),
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, is_active)
VALUES
  ('WELCOME10', '10% off your first bespoke tailoring order', 'percentage', 10, 1000, 2500, true),
  ('SUIDHAGA500', 'Flat PKR 500 off orders above PKR 3,000', 'fixed', 500, 3000, 500, true),
  ('EID20', '20% festive tailoring discount', 'percentage', 20, 5000, 5000, true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  target_role text NOT NULL DEFAULT 'all' CHECK (target_role IN ('customer', 'tailor', 'all')),
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.subscription_plans (slug, name, description, target_role, price_monthly, price_yearly, currency, features, limits, is_popular, sort_order)
VALUES
  (
    'customer-free',
    'Starter',
    'Essential access to custom tailoring discovery and AI design studio.',
    'customer',
    0,
    0,
    'PKR',
    '["5 AI design generations / month", "Save up to 10 designs", "1 measurement profile", "Standard tailor discovery"]'::jsonb,
    '{"aiGenerations": 5, "savedDesigns": 10, "measurements": 1}'::jsonb,
    false,
    1
  ),
  (
    'customer-plus',
    'Atelier Plus',
    'Unlimited AI fashion studio concepts, 3D measurement profiles, and priority booking.',
    'customer',
    1499,
    14990,
    'PKR',
    '["Unlimited AI Text/Image/Sketch designs", "PDF Tech Pack exports", "Unlimited family measurement profiles", "Priority tailor booking & 5% order cashback"]'::jsonb,
    '{"aiGenerations": -1, "savedDesigns": -1, "measurements": -1}'::jsonb,
    true,
    2
  ),
  (
    'tailor-pro',
    'Master Tailor Pro',
    'Featured directory placement, lower platform fees, and full studio analytics.',
    'tailor',
    3999,
    39990,
    'PKR',
    '["Featured placement on Explore & Map", "Reduced 5% platform commission", "Unlimited portfolio gallery images", "Priority payout processing & analytics"]'::jsonb,
    '{"commissionRate": 5, "galleryImages": -1, "featuredBadge": true}'::jsonb,
    true,
    3
  ),
  (
    'atelier-enterprise',
    'Boutique Enterprise',
    'Multi-branch atelier management with custom branding and dedicated support.',
    'tailor',
    8999,
    89990,
    'PKR',
    '["Multi-tailor team & branch support", "3% lowest platform commission", "Custom tech-pack branding", "Dedicated account manager"]'::jsonb,
    '{"commissionRate": 3, "galleryImages": -1, "branches": 10}'::jsonb,
    false,
    4
  )
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'cancelled', 'expired')),
  provider text NOT NULL DEFAULT 'stripe',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('tailor', 'design')),
  tailor_id uuid REFERENCES public.tailors(id) ON DELETE CASCADE,
  design_id uuid REFERENCES public.designs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_wishlist_item CHECK (
    (item_type = 'tailor' AND tailor_id IS NOT NULL) OR
    (item_type = 'design' AND design_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist_items (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wishlist_user_tailor ON public.wishlist_items (user_id, tailor_id) WHERE tailor_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wishlist_user_design ON public.wishlist_items (user_id, design_id) WHERE design_id IS NOT NULL;

-- ============================================================================
-- 4. COMMUNITY ENHANCEMENTS (Visibility & Follow System)
-- ============================================================================

ALTER TABLE IF EXISTS public.community_posts
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_community_posts_visibility' AND conrelid = 'public.community_posts'::regclass
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT chk_community_posts_visibility CHECK (visibility IN ('public', 'followers', 'private'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_posts_visibility ON public.community_posts (visibility);

CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT chk_user_follows_distinct CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows (following_id);

-- ============================================================================
-- 5. ADMIN PORTAL TABLES (Disputes, CMS, Platform Settings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  against_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tailor_id uuid REFERENCES public.tailors(id) ON DELETE SET NULL,
  reason text NOT NULL,
  description text,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
  resolution text,
  resolution_action text CHECK (resolution_action IS NULL OR resolution_action IN ('refund_full', 'refund_partial', 'release_to_tailor', 'no_action', 'other')),
  refund_amount numeric(10,2),
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_order ON public.disputes (order_id);

CREATE TABLE IF NOT EXISTS public.cms_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  section text NOT NULL DEFAULT 'general',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.cms_content (key, title, section, content, is_published)
VALUES
  (
    'hero',
    'Homepage Hero Banner',
    'landing',
    '{"headline": "Bespoke Tailoring Meets AI Couture", "subheadline": "Design your dream outfit with AI and get it stitched by verified master tailors near you.", "ctaText": "Explore Tailors", "ctaLink": "/tailors"}'::jsonb,
    true
  ),
  (
    'about',
    'About Sui Dhaga',
    'pages',
    '{"heading": "Crafting Heritage with Technology", "body": "Sui Dhaga connects discerning clients with master artisans across Pakistan, combining AI-assisted outfit visualization, body measurement precision, and transparent bespoke order tracking."}'::jsonb,
    true
  ),
  (
    'faq',
    'Frequently Asked Questions',
    'pages',
    '{"items": [{"question": "How do virtual measurements work?", "answer": "Upload guided photos or enter your measurements manually to share accurate specs with any tailor."}, {"question": "How are payments protected?", "answer": "Payments are held securely and settled with verified tailors upon milestone fulfillment."}]}'::jsonb,
    true
  )
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('commissionRate', '10'::jsonb, 'Default platform commission percentage on tailor orders'),
  ('minWithdrawalAmount', '1000'::jsonb, 'Minimum withdrawal amount in PKR'),
  ('currency', '"PKR"'::jsonb, 'Default platform currency'),
  ('maintenanceMode', 'false'::jsonb, 'Toggle platform maintenance mode'),
  ('allowNewRegistrations', 'true'::jsonb, 'Allow new customer and tailor registrations'),
  ('autoApproveTailors', 'false'::jsonb, 'Automatically approve new tailor applications'),
  ('supportEmail', '"support@suidhaga.com"'::jsonb, 'Platform support contact email'),
  ('paymentGateways', '{"stripe": true, "safepay": true, "jazzcash": true, "easypaisa": true, "cod": true}'::jsonb, 'Enabled checkout payment gateways')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 6. STATIC / CONTENT PAGES (Contact, Fabrics, Blog)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  category text DEFAULT 'general',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.fabrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE,
  material text NOT NULL,
  category text DEFAULT 'all',
  description text,
  price_per_meter numeric(10,2) NOT NULL DEFAULT 0.00,
  currency text NOT NULL DEFAULT 'PKR',
  color text,
  colors text[] NOT NULL DEFAULT '{}',
  pattern text,
  weight_gsm integer,
  width_inches numeric(5,2),
  origin text,
  care_instructions text,
  image_url text,
  in_stock boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fabrics_in_stock ON public.fabrics (in_stock);
CREATE INDEX IF NOT EXISTS idx_fabrics_material ON public.fabrics (material);

INSERT INTO public.fabrics (slug, name, material, category, description, price_per_meter, color, colors, pattern, weight_gsm, width_inches, origin, care_instructions, in_stock, is_featured)
VALUES
  ('pure-banarsi-katan-silk', 'Pure Banarsi Katan Silk', 'Silk', 'Bridal & Festive', 'Handwoven katan silk with fine zari sheen ideal for bridal lehengas, ghararas, and sherwanis.', 4200, 'Crimson', ARRAY['Crimson', 'Ivory', 'Emerald', 'Gold'], 'Jacquard Zari', 140, 44, 'Pakistan / Heritage Weave', 'Dry clean only', true, true),
  ('egyptian-giza-cotton-lawn', 'Egyptian Giza Cotton Lawn', 'Cotton', 'Summer & Casual', 'Ultra-soft long-staple combed cotton lawn breathable for everyday kurtas and shalwar kameez.', 1450, 'Ivory', ARRAY['Ivory', 'Sky Blue', 'Blush', 'Sage'], 'Solid', 110, 56, 'Faisalabad Mill', 'Machine wash cold gentle', true, true),
  ('italian-super-120s-wool', 'Italian Super 120s Worsted Wool', 'Wool', 'Formal Suiting', 'Crisp drape worsted wool suiting crafted for structured three-piece suits, waistcoats, and tuxedos.', 6800, 'Charcoal', ARRAY['Charcoal', 'Navy', 'Midnight Black', 'Camel'], 'Twill', 260, 58, 'Biella / Imported', 'Dry clean only', true, true),
  ('handloom-raw-silk', 'Handloom Pure Raw Silk', 'Raw Silk', 'Festive & Formal', 'Textured slub raw silk holding structured silhouettes for Anarkalis, sherwanis, and formal jackets.', 3200, 'Emerald', ARRAY['Emerald', 'Plum', 'Champagne', 'Teal'], 'Textured Slub', 165, 44, 'Multan Looms', 'Dry clean recommended', true, false),
  ('french-crinkle-chiffon', 'Pure Crinkle Chiffon', 'Chiffon', 'Dupattas & Formals', 'Lightweight airy pure chiffon engineered for flowing dupattas, drapes, and delicate handwork.', 1950, 'Champagne', ARRAY['Champagne', 'Rose', 'Mint', 'Black'], 'Solid', 75, 44, 'Lahore Atelier', 'Hand wash cold or dry clean', true, false),
  ('boski-spun-silk', 'Classic Pakistani Boski', 'Spun Silk', 'Menswear Heritage', 'Signature golden-ivory spun silk prized for ceremonial kurtas and summer formal wear.', 3800, 'Cream', ARRAY['Cream', 'Off-White', 'Sand'], 'Plain Weave', 150, 54, 'Karachi Heritage', 'Gentle hand wash or dry clean', true, true)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL,
  cover_image_url text,
  category text NOT NULL DEFAULT 'Guides',
  tags text[] NOT NULL DEFAULT '{}',
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Sui Dhaga Editorial',
  read_time_minutes integer NOT NULL DEFAULT 5,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts (category);

INSERT INTO public.blog_posts (slug, title, excerpt, content, category, tags, author_name, read_time_minutes, is_published)
VALUES
  (
    'complete-guide-to-pakistani-bridal-fabrics',
    'The Complete Guide to Choosing Bridal & Festive Fabrics',
    'Compare katan silk, velvet, tissue, and organza to pick the right drape and embroidery base for your wedding ensemble.',
    'Choosing the right textile defines how a custom garment drapes, holds hand embroidery, and feels across long wedding celebrations.\n\n1. Pure Katan Silk & Jamawar: Ideal for structured lehengas, peplums, and groom sherwanis where heavy zardozi needs firm support.\n2. Silk Velvet: Unmatched richness for winter Barat events with deep jewel tones.\n3. Crushed Tissue & Organza: Creates ethereal volume for Walima silhouettes and scalloped dupattas.\n\nPro tip: Share your Sui Dhaga AI Tech Pack directly with a verified tailor to confirm exact yardage before purchasing cloth.',
    'Fabric Guide',
    ARRAY['bridal', 'fabrics', 'silk', 'wedding'],
    'Amina Tariq',
    6,
    true
  ),
  (
    'how-to-take-accurate-tailoring-measurements',
    'How to Measure Yourself Accurately for Bespoke Tailoring',
    'Follow these seven simple tape-measure checkpoints—or use virtual capture—for a flawless first fitting.',
    'Great tailoring begins with consistent measurements taken over light clothing while standing relaxed.\n\nKey checkpoints:\n- Chest / Bust: Wrap tape horizontally across the fullest part, keeping two fingers of ease.\n- Shoulder Width: Measure bone-to-bone across the upper back.\n- Natural Waist: Find the narrowest point just above the navel.\n- Sleeve Length: From shoulder seam slightly bent down to the wrist bone.\n\nSave multiple profiles in your Sui Dhaga Measurements dashboard for casual kurtas, formal suiting, and family members.',
    'Sizing & Fit',
    ARRAY['measurements', 'fit', 'guide'],
    'Zainab Malik',
    5,
    true
  ),
  (
    'from-ai-sketch-to-tailor-tech-pack',
    'From AI Design Prompt to Finished Garment: Working with Tech Packs',
    'Learn how to turn text prompts and hand sketches into clear production specs your master tailor can stitch.',
    'Communication gaps between inspiration photos and finished garments often happen around collar shapes, embroidery density, and lining choices.\n\nWith the Sui Dhaga AI Design Studio:\n1. Generate concepts via Text-to-Design, Image-to-Design, or Sketch-to-Design.\n2. Refine your color palette, fabric swatch, and embroidery notes in the Studio Editor.\n3. Export a structured Tech Pack PDF and share it directly with your chosen tailor.',
    'AI Studio',
    ARRAY['ai-studio', 'tech-pack', 'custom-design'],
    'Sui Dhaga Editorial',
    4,
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 7. UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================================================

DROP TRIGGER IF EXISTS tr_design_templates_updated_at ON public.design_templates;
CREATE TRIGGER tr_design_templates_updated_at BEFORE UPDATE ON public.design_templates FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_tailor_payout_settings_updated_at ON public.tailor_payout_settings;
CREATE TRIGGER tr_tailor_payout_settings_updated_at BEFORE UPDATE ON public.tailor_payout_settings FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_tailor_payouts_updated_at ON public.tailor_payouts;
CREATE TRIGGER tr_tailor_payouts_updated_at BEFORE UPDATE ON public.tailor_payouts FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_addresses_updated_at ON public.addresses;
CREATE TRIGGER tr_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER tr_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_coupons_updated_at ON public.coupons;
CREATE TRIGGER tr_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER tr_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER tr_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_disputes_updated_at ON public.disputes;
CREATE TRIGGER tr_disputes_updated_at BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_cms_content_updated_at ON public.cms_content;
CREATE TRIGGER tr_cms_content_updated_at BEFORE UPDATE ON public.cms_content FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER tr_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_contact_messages_updated_at ON public.contact_messages;
CREATE TRIGGER tr_contact_messages_updated_at BEFORE UPDATE ON public.contact_messages FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_fabrics_updated_at ON public.fabrics;
CREATE TRIGGER tr_fabrics_updated_at BEFORE UPDATE ON public.fabrics FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER tr_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================================================
-- 8. ROW LEVEL SECURITY POLICIES FOR NEW TABLES
-- ============================================================================

ALTER TABLE public.design_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailor_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailor_payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailor_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Design templates viewable by everyone" ON public.design_templates;
CREATE POLICY "Design templates viewable by everyone" ON public.design_templates FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage design templates" ON public.design_templates;
CREATE POLICY "Admins manage design templates" ON public.design_templates FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Blocked dates viewable by everyone" ON public.tailor_blocked_dates;
CREATE POLICY "Blocked dates viewable by everyone" ON public.tailor_blocked_dates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tailors manage their blocked dates" ON public.tailor_blocked_dates;
CREATE POLICY "Tailors manage their blocked dates" ON public.tailor_blocked_dates
  FOR ALL USING (EXISTS (SELECT 1 FROM public.tailors WHERE id = tailor_id AND user_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "Tailors manage their payout settings" ON public.tailor_payout_settings;
CREATE POLICY "Tailors manage their payout settings" ON public.tailor_payout_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM public.tailors WHERE id = tailor_id AND user_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "Tailors view and request their payouts" ON public.tailor_payouts;
CREATE POLICY "Tailors view and request their payouts" ON public.tailor_payouts
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users manage their own addresses" ON public.addresses;
CREATE POLICY "Users manage their own addresses" ON public.addresses
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users manage their own payment methods" ON public.payment_methods;
CREATE POLICY "Users manage their own payment methods" ON public.payment_methods
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Active coupons readable by authenticated" ON public.coupons;
CREATE POLICY "Active coupons readable by authenticated" ON public.coupons
  FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Subscription plans viewable by everyone" ON public.subscription_plans;
CREATE POLICY "Subscription plans viewable by everyone" ON public.subscription_plans
  FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins manage subscription plans" ON public.subscription_plans FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users view and manage their subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users view and manage their subscriptions" ON public.user_subscriptions
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users manage their own wishlist items" ON public.wishlist_items;
CREATE POLICY "Users manage their own wishlist items" ON public.wishlist_items
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Follows viewable by everyone" ON public.user_follows;
CREATE POLICY "Follows viewable by everyone" ON public.user_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage their own follows" ON public.user_follows;
CREATE POLICY "Users manage their own follows" ON public.user_follows
  FOR ALL USING (follower_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users view own disputes" ON public.disputes;
CREATE POLICY "Users view own disputes" ON public.disputes
  FOR SELECT USING (raised_by = auth.uid() OR against_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users create disputes" ON public.disputes;
CREATE POLICY "Users create disputes" ON public.disputes
  FOR INSERT WITH CHECK (raised_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage disputes" ON public.disputes;
CREATE POLICY "Admins manage disputes" ON public.disputes FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Published CMS readable by everyone" ON public.cms_content;
CREATE POLICY "Published CMS readable by everyone" ON public.cms_content
  FOR SELECT USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage CMS" ON public.cms_content;
CREATE POLICY "Admins manage CMS" ON public.cms_content FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins manage platform settings" ON public.platform_settings FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage contact messages" ON public.contact_messages;
CREATE POLICY "Admins manage contact messages" ON public.contact_messages FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Fabrics viewable by everyone" ON public.fabrics;
CREATE POLICY "Fabrics viewable by everyone" ON public.fabrics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tailors or admins manage fabrics" ON public.fabrics;
CREATE POLICY "Tailors or admins manage fabrics" ON public.fabrics
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Published blog posts viewable by everyone" ON public.blog_posts;
CREATE POLICY "Published blog posts viewable by everyone" ON public.blog_posts
  FOR SELECT USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage blog posts" ON public.blog_posts;
CREATE POLICY "Admins manage blog posts" ON public.blog_posts FOR ALL USING (public.is_admin());
