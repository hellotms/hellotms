-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    designation text NOT NULL,
    photo_url text,
    facebook_url text,
    linkedin_url text,
    twitter_url text,
    display_order integer DEFAULT 0,
    is_published boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Allow public read access where is_published is true and not deleted
CREATE POLICY "Public profiles are viewable by everyone."
ON public.team_members FOR SELECT
USING (is_published = true AND deleted_at IS NULL);

-- Allow authenticated users (admin) to read everything
CREATE POLICY "Admins can view all profiles."
ON public.team_members FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Admins can insert profiles."
ON public.team_members FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Admins can update profiles."
ON public.team_members FOR UPDATE 
TO authenticated 
USING (true);
