-- ============================================================================
-- Sui Dhaga Rollback Migration: 012_database_optimization_down.sql
-- Description:
--   Rollback script for 012_database_optimization.sql
-- ============================================================================

-- 1. Re-add notes column to orders
ALTER TABLE IF EXISTS public.orders
ADD COLUMN IF NOT EXISTS notes text;

-- 2. Re-add is_blocked column to profiles
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

UPDATE public.profiles
SET is_blocked = (status = 'blocked');

-- 3. Drop verification trigger
DROP TRIGGER IF EXISTS tr_sync_tailor_verification ON public.tailors;
DROP FUNCTION IF EXISTS public.sync_tailor_verification_status();

-- 4. Re-create fabrics table
CREATE TABLE IF NOT EXISTS public.fabrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  material text NOT NULL,
  price_per_meter numeric(10,2) NOT NULL DEFAULT 0.00,
  color text,
  pattern text,
  image_url text,
  in_stock boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fabrics_in_stock ON public.fabrics (in_stock);

DROP TRIGGER IF EXISTS tr_fabrics_updated_at ON public.fabrics;
CREATE TRIGGER tr_fabrics_updated_at BEFORE UPDATE ON public.fabrics FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 5. Re-create wishlist_items table
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
CREATE INDEX IF NOT EXISTS idx_wishlist_tailor ON public.wishlist_items (tailor_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_design ON public.wishlist_items (design_id);

-- 6. Drop newly added indexes
DROP INDEX IF EXISTS public.idx_orders_service_id;
DROP INDEX IF EXISTS public.idx_orders_design_id;
DROP INDEX IF EXISTS public.idx_orders_measurement_id;
DROP INDEX IF EXISTS public.idx_appointments_service_id;
DROP INDEX IF EXISTS public.idx_designs_duplicated_from_id;
DROP INDEX IF EXISTS public.idx_reports_reporter_id;
DROP INDEX IF EXISTS public.idx_reports_target;
