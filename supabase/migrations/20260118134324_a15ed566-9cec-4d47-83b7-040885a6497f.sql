-- Fix staff creation failure (Auth "Database error creating new user") caused by user_roles constraints mismatch.
-- The system assumes ONE role per user (client code uses maybeSingle), so we enforce UNIQUE(user_id)
-- and update handle_new_user() to upsert against that constraint.

-- 1) Deduplicate user_roles so there's at most one row per user_id (keep newest by created_at).
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.user_roles
)
DELETE FROM public.user_roles ur
USING ranked r
WHERE ur.id = r.id
  AND r.rn > 1;

-- 2) Add UNIQUE(user_id) (needed for ON CONFLICT (user_id) in triggers and client upserts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_key'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 3) Make the auth trigger function robust: always write a valid role and upsert by user_id.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_text text;
  v_role public.app_role;
BEGIN
  -- Ensure profile exists/updated
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- Choose a valid role from metadata, defaulting to 'client'
  v_role_text := NEW.raw_user_meta_data ->> 'role';
  v_role := CASE v_role_text
    WHEN 'admin' THEN 'admin'::public.app_role
    WHEN 'editor' THEN 'editor'::public.app_role
    WHEN 'support_agent' THEN 'support_agent'::public.app_role
    WHEN 'client' THEN 'client'::public.app_role
    ELSE 'client'::public.app_role
  END;

  -- One role per user (upsert)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role;

  RETURN NEW;
END;
$$;
