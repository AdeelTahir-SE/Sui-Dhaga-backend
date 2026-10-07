-- Migration 010: Peer-to-Peer User Blocks
-- Allows users to block other users to prevent unwanted messages, spam, and interactions.

CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_blocks UNIQUE (blocker_id, blocked_id),
    CONSTRAINT chk_user_blocks_distinct CHECK (blocker_id <> blocked_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks (blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_created_at ON public.user_blocks (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view blocks they created or are target of" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can insert their own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Admin full access to user_blocks" ON public.user_blocks;

-- RLS policies
CREATE POLICY "Users can view blocks they created or are target of"
    ON public.user_blocks
    FOR SELECT
    USING (
        auth.uid() = blocker_id OR
        auth.uid() = blocked_id OR
        (auth.jwt() ->> 'role') = 'service_role' OR
        public.is_admin()
    );

CREATE POLICY "Users can insert their own blocks"
    ON public.user_blocks
    FOR INSERT
    WITH CHECK (
        auth.uid() = blocker_id OR
        (auth.jwt() ->> 'role') = 'service_role' OR
        public.is_admin()
    );

CREATE POLICY "Users can delete their own blocks"
    ON public.user_blocks
    FOR DELETE
    USING (
        auth.uid() = blocker_id OR
        (auth.jwt() ->> 'role') = 'service_role' OR
        public.is_admin()
    );

CREATE POLICY "Admin full access to user_blocks"
    ON public.user_blocks
    FOR ALL
    USING (
        (auth.jwt() ->> 'role') = 'service_role' OR
        public.is_admin()
    );
