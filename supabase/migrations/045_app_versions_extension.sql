-- 1. Add file_extension column
ALTER TABLE public.app_versions ADD COLUMN file_extension text;

-- 2. Update existing data
UPDATE public.app_versions SET file_extension = '.msi' WHERE platform = 'windows';
UPDATE public.app_versions SET file_extension = '.apk' WHERE platform = 'android';

-- 3. Make it NOT NULL for future entries
ALTER TABLE public.app_versions ALTER COLUMN file_extension SET NOT NULL;

-- 4. Update the trigger function to be unique per (platform, file_extension)
CREATE OR REPLACE FUNCTION public.handle_app_version_latest()
RETURNS TRIGGER AS $$
BEGIN
    if NEW.is_latest = true then
        UPDATE public.app_versions 
        SET is_latest = false 
        WHERE platform = NEW.platform 
          AND file_extension = NEW.file_extension 
          AND id != NEW.id;
    end if;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
