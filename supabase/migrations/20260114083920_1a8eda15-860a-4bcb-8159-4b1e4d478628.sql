-- Allow authenticated users (clients) to read ONLY the meeting scheduling settings
-- This fixes the portal showing all days unavailable due to RLS blocking system_settings reads.

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Create policy only if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_settings'
      AND policyname = 'Authenticated can read meeting_settings'
  ) THEN
    CREATE POLICY "Authenticated can read meeting_settings"
      ON public.system_settings
      FOR SELECT
      TO authenticated
      USING (key = 'meeting_settings');
  END IF;
END $$;