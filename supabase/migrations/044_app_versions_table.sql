-- Create app_versions table to store history of Windows and Android app releases
CREATE TABLE IF NOT EXISTS public.app_versions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    platform text NOT NULL CHECK (platform IN ('windows', 'android')),
    version text NOT NULL, -- e.g., '1.0.0'
    url text NOT NULL, -- R2 URL
    size bigint, -- in bytes
    changelog text,
    is_latest boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Index for performance when fetching latest
CREATE INDEX IF NOT EXISTS idx_app_versions_platform_latest ON public.app_versions(platform, is_latest) WHERE is_latest = true;

-- Enable RLS
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Everyone logged in can view app versions
CREATE POLICY "Authenticated users can view app versions" ON public.app_versions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users with manage_cms permission can manage versions
CREATE POLICY "Users with manage_cms permission can manage app versions" ON public.app_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() 
            AND (r.permissions->>'manage_cms')::boolean = true
        )
    );

-- Function to ensure only one 'is_latest' per platform
CREATE OR REPLACE FUNCTION public.handle_app_version_latest()
RETURNS TRIGGER AS $$
BEGIN
    if NEW.is_latest = true then
        UPDATE public.app_versions 
        SET is_latest = false 
        WHERE platform = NEW.platform AND id != NEW.id;
    end if;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_app_version_upsert
    BEFORE INSERT OR UPDATE ON public.app_versions
    FOR EACH ROW EXECUTE FUNCTION public.handle_app_version_latest();
