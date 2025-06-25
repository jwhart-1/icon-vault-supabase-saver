
-- Add downloads_count column to the icons table
ALTER TABLE public.icons 
ADD COLUMN downloads_count integer DEFAULT 0;
