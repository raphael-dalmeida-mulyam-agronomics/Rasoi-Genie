-- Migration: Add instruction_type, video_url, and original_hero_image to public.chef_submissions
-- Ensures full column fidelity if applied in Supabase dashboard

ALTER TABLE public.chef_submissions 
  ADD COLUMN IF NOT EXISTS instruction_type TEXT DEFAULT 'steps',
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS original_hero_image TEXT;

-- Ensure Realtime publication includes chef_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chef_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chef_submissions;
  END IF;
END $$;
