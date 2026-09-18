-- Migration: 003_fix_orders_table.sql
-- Fix the orders table to support:
-- - item_name (outfit / garment name)
-- - measurements (jsonb snapshot of user measurements that can be updated for the order)
-- - design_images (text[] array of design / reference images)
-- - additional_notes (text for any additional user instructions)
-- - delivery_date (text)
-- - order-designs storage bucket for user attached designs

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS item_name text,
  ADD COLUMN IF NOT EXISTS measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS design_images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS additional_notes text,
  ADD COLUMN IF NOT EXISTS delivery_date text;

-- Create order-designs storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-designs', 'order-designs', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies for order-designs bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Order designs are publicly accessible'
  ) THEN
    CREATE POLICY "Order designs are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'order-designs');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload order designs'
  ) THEN
    CREATE POLICY "Authenticated users can upload order designs"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'order-designs' AND auth.role() = 'authenticated');
  END IF;
END $$;
