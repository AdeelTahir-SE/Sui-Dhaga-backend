-- Migration 009: In-App Updates and Version Management
-- Provides version control for mobile apps (Android APK & iOS) to trigger optional or mandatory updates.

CREATE TABLE IF NOT EXISTS public.app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios', 'all')),
    latest_version TEXT NOT NULL,                -- Target latest released version, e.g. '1.1.0'
    min_version TEXT NOT NULL,                   -- Minimum allowed version, e.g. '1.0.0'. Below this is MANDATORY update.
    download_url TEXT NOT NULL,                  -- Direct download URL (APK or Play Store link)
    release_notes TEXT,                          -- Human-readable changelog / what's new
    force_update BOOLEAN NOT NULL DEFAULT false, -- Global flag to force update regardless of version number
    is_active BOOLEAN NOT NULL DEFAULT true,     -- Active status flag
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow public read access to active app_versions" ON public.app_versions;
DROP POLICY IF EXISTS "Allow admin full access to app_versions" ON public.app_versions;

-- Allow public read access to active versions (clients check before logging in)
CREATE POLICY "Allow public read access to active app_versions"
    ON public.app_versions
    FOR SELECT
    USING (is_active = true);

-- Allow service role and admins full management access
CREATE POLICY "Allow admin full access to app_versions"
    ON public.app_versions
    FOR ALL
    USING (
        (auth.jwt() ->> 'role') = 'service_role' OR 
        public.is_admin()
    )
    WITH CHECK (
        (auth.jwt() ->> 'role') = 'service_role' OR 
        public.is_admin()
    );

-- Fast lookup index
CREATE INDEX IF NOT EXISTS idx_app_versions_lookup 
    ON public.app_versions (platform, is_active, created_at DESC);

-- Seed initial row
INSERT INTO public.app_versions (platform, latest_version, min_version, download_url, release_notes, force_update, is_active)
VALUES (
    'android',
    '1.0.0',
    '1.0.0',
    'https://github.com/your-org/sui-dhaga/releases/latest',
    '• Initial release with custom tailoring, booking appointments, and bespoke design studio.\n• Performance optimizations and bug fixes.',
    false,
    true
)
ON CONFLICT DO NOTHING;
