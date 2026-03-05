-- Change entity_id in audit_logs to text to support non-UUID ids (like site_settings id 1)
ALTER TABLE public.audit_logs ALTER COLUMN entity_id TYPE text;
