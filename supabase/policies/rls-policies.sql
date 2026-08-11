-- Row Level Security (RLS) Policies for Sui Dhaga

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view public resources or resources they own, or all if admin
CREATE POLICY "Select resources policy" ON public.resources
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    (data->>'is_public')::boolean = true OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Policy 2: Authenticated users can insert their own resources
CREATE POLICY "Insert resources policy" ON public.resources
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Policy 3: Resource owners or admins can update resources
CREATE POLICY "Update resources policy" ON public.resources
  FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- Policy 4: Resource owners or admins can delete resources
CREATE POLICY "Delete resources policy" ON public.resources
  FOR DELETE
  USING (
    owner_id = auth.uid() OR
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );
