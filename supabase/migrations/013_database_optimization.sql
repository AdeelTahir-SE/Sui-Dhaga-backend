-- ============================================================================
-- Sui Dhaga Relational Database Schema Optimization
-- Supabase PostgreSQL Migration: 013_database_optimization.sql
-- Description:
--   1. Data consolidation & removal of redundant columns:
--      - orders.notes (consolidated into orders.additional_notes)
--      - profiles.is_blocked (consolidated into profiles.status enum)
--   2. State synchronization trigger for tailors.verified & tailors.verification_status
--   3. Removal of duplicate & redundant indexes (tailor_availability, notifications)
--   4. Creation of missing high-performance foreign key indexes (orders, appointments, designs, reports)
--   5. Removal of unused / orphaned tables (fabrics, wishlist_items)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CONSOLIDATE & DROP REDUNDANT COLUMNS
-- ----------------------------------------------------------------------------

-- A. orders: Consolidate 'notes' into 'additional_notes'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'notes'
  ) THEN
    -- Preserve any notes that exist where additional_notes was null
    UPDATE public.orders
    SET additional_notes = coalesce(additional_notes, notes)
    WHERE additional_notes IS NULL AND notes IS NOT NULL;

    -- Drop the duplicate column
    ALTER TABLE public.orders DROP COLUMN notes;
  END IF;
END $$;

-- B. profiles: Consolidate 'is_blocked' into 'status'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_blocked'
  ) THEN
    -- Ensure status reflects blocked accounts
    UPDATE public.profiles
    SET status = 'blocked'::public.account_status
    WHERE is_blocked = true AND status = 'active';

    -- Drop the redundant boolean flag
    ALTER TABLE public.profiles DROP COLUMN is_blocked;
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 2. SYNCHRONIZE TAILOR VERIFICATION STATE
-- ----------------------------------------------------------------------------
-- Ensures 'verified' boolean and 'verification_status' enum can never drift out of sync.

CREATE OR REPLACE FUNCTION public.sync_tailor_verification_status()
RETURNS trigger AS $$
BEGIN
  -- If verification_status is explicitly updated or inserted
  IF TG_OP = 'INSERT' OR NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    NEW.verified := (NEW.verification_status = 'verified');
  -- If verified boolean is updated directly by legacy callers
  ELSIF NEW.verified IS DISTINCT FROM OLD.verified THEN
    IF NEW.verified = true THEN
      NEW.verification_status := 'verified'::public.tailor_verification_status;
    ELSIF OLD.verification_status = 'verified' THEN
      NEW.verification_status := 'pending'::public.tailor_verification_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_tailor_verification ON public.tailors;
CREATE TRIGGER tr_sync_tailor_verification
BEFORE INSERT OR UPDATE OF verification_status, verified ON public.tailors
FOR EACH ROW EXECUTE FUNCTION public.sync_tailor_verification_status();

-- Sync existing data to ensure strict consistency
UPDATE public.tailors
SET verified = (verification_status = 'verified')
WHERE verified IS DISTINCT FROM (verification_status = 'verified');


-- ----------------------------------------------------------------------------
-- 3. DROP DUPLICATE & REDUNDANT INDEXES
-- ----------------------------------------------------------------------------

-- Duplicate index on tailor_availability (tailor_id, day_of_week)
-- (idx_tailor_availability_day already covers this)
DROP INDEX IF EXISTS public.idx_tailor_availability_tailor_lookup;

-- Duplicate index on notifications (user_id, created_at DESC)
-- (idx_notifications_user already covers this)
DROP INDEX IF EXISTS public.idx_notifications_user_created;

-- Duplicate index on notifications (user_id, is_read)
-- (idx_notifications_unread already covers this)
DROP INDEX IF EXISTS public.idx_notifications_unread_user;


-- ----------------------------------------------------------------------------
-- 4. ADD MISSING FOREIGN KEY & QUERY PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

-- Foreign keys on orders
CREATE INDEX IF NOT EXISTS idx_orders_service_id ON public.orders (service_id);
CREATE INDEX IF NOT EXISTS idx_orders_design_id ON public.orders (design_id);
CREATE INDEX IF NOT EXISTS idx_orders_measurement_id ON public.orders (measurement_id);

-- Foreign keys on appointments
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON public.appointments (service_id);

-- Self-referencing FK on designs for duplicates/templates
CREATE INDEX IF NOT EXISTS idx_designs_duplicated_from_id ON public.designs (duplicated_from_id);

-- Indexes for moderation & admin reports
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports (target_type, target_id);


-- ----------------------------------------------------------------------------
-- 5. DROP UNUSED / ORPHANED TABLES
-- ----------------------------------------------------------------------------

-- A. Drop fabrics catalog (unused, zero foreign key references across application)
DROP TRIGGER IF EXISTS tr_fabrics_updated_at ON public.fabrics;
DROP TABLE IF EXISTS public.fabrics CASCADE;

-- B. Drop wishlist_items (unused in mobile application)
DROP TABLE IF EXISTS public.wishlist_items CASCADE;
