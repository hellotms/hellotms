-- 014_add_site_motto.sql

-- Add site_motto to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS site_motto text;

-- Ensure public.profiles has the 'address' and 'phone' columns (User mentioned cache error)
-- If they already exist, this will do nothing.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='address') THEN
        ALTER TABLE public.profiles ADD COLUMN address text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone text;
    END IF;
END $$;

-- Force a schema cache refresh (PostgREST)
NOTIFY pgrst, 'reload schema';
