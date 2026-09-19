-- Migration: 005_add_measurement_fields.sql
-- Add top and bottom length columns to public.measurements table:
-- - shirt_length numeric(5,2) (top / shirt length)
-- - trouser_length numeric(5,2) (trouser / bottom length)

ALTER TABLE IF EXISTS public.measurements
  ADD COLUMN IF NOT EXISTS shirt_length numeric(5,2),
  ADD COLUMN IF NOT EXISTS trouser_length numeric(5,2);
