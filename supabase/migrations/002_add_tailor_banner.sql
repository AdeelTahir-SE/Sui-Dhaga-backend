-- Add banner_url to tailors table
ALTER TABLE IF EXISTS public.tailors 
ADD COLUMN IF NOT EXISTS banner_url text;

-- Add tailor-banners storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tailor-banners', 'tailor-banners', true) 
ON CONFLICT (id) DO NOTHING;
