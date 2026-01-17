-- Step 1: Drop dependent functions first
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Step 2: Remove default constraint from role column
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;

-- Step 3: Create new enum type (if not exists from previous attempt)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role_new') THEN
    CREATE TYPE public.app_role_new AS ENUM ('admin', 'editor', 'support_agent', 'client');
  END IF;
END $$;

-- Step 4: Update user_roles table to use new enum
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role_new 
  USING (
    CASE role::text 
      WHEN 'viewer' THEN 'client'::public.app_role_new
      ELSE role::text::public.app_role_new
    END
  );

-- Step 5: Drop old enum and rename new one
DROP TYPE IF EXISTS public.app_role CASCADE;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Step 6: Set new default
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'client'::public.app_role;

-- Step 7: Recreate has_role function with new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 8: Recreate is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::public.app_role
  )
$$;

-- Step 9: Recreate is_admin_or_editor function
CREATE OR REPLACE FUNCTION public.is_admin_or_editor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'editor'::public.app_role)
  )
$$;

-- Step 10: Recreate is_support_agent function
CREATE OR REPLACE FUNCTION public.is_support_agent(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'support_agent'::public.app_role
  )
$$;

-- Step 11: Create is_client function
CREATE OR REPLACE FUNCTION public.is_client(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_accounts
    WHERE user_id = _user_id AND is_active = true
  )
$$;

-- Step 12: Recreate is_staff function
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE user_id = _user_id AND is_active = true
  )
$$;

-- Step 13: Update get_user_type function
CREATE OR REPLACE FUNCTION public.get_user_type(_user_id uuid)
RETURNS TABLE (
  user_type text,
  role_name text,
  staff_id uuid,
  client_id uuid,
  organization_id uuid,
  display_name text,
  can_reply_tickets boolean,
  can_manage_content boolean,
  can_attend_meetings boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_staff_id uuid;
  v_client_id uuid;
  v_org_id uuid;
  v_display_name text;
  v_can_reply boolean := false;
  v_can_content boolean := false;
  v_can_meetings boolean := false;
BEGIN
  -- Get user role from user_roles table
  SELECT ur.role INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  LIMIT 1;

  -- Check if user is staff member
  SELECT sm.id, sm.full_name, sm.can_reply_tickets, sm.can_manage_content, sm.can_attend_meetings
  INTO v_staff_id, v_display_name, v_can_reply, v_can_content, v_can_meetings
  FROM public.staff_members sm
  WHERE sm.user_id = _user_id AND sm.is_active = true
  LIMIT 1;

  -- Check if user is client account
  IF v_staff_id IS NULL THEN
    SELECT ca.id, ca.organization_id, ca.full_name
    INTO v_client_id, v_org_id, v_display_name
    FROM public.client_accounts ca
    WHERE ca.user_id = _user_id AND ca.is_active = true
    LIMIT 1;
  END IF;

  -- If no display name found, get from profiles
  IF v_display_name IS NULL THEN
    SELECT p.full_name INTO v_display_name
    FROM public.profiles p
    WHERE p.id = _user_id;
  END IF;

  -- Determine user type based on role and associations
  IF v_role = 'admin' THEN
    RETURN QUERY SELECT 
      'admin'::text,
      'admin'::text,
      v_staff_id,
      v_client_id,
      v_org_id,
      COALESCE(v_display_name, ''),
      v_can_reply,
      v_can_content,
      v_can_meetings;
  ELSIF v_role = 'editor' THEN
    RETURN QUERY SELECT 
      'editor'::text,
      'editor'::text,
      v_staff_id,
      v_client_id,
      v_org_id,
      COALESCE(v_display_name, ''),
      v_can_reply,
      v_can_content,
      v_can_meetings;
  ELSIF v_role = 'support_agent' OR v_staff_id IS NOT NULL THEN
    RETURN QUERY SELECT 
      'staff'::text,
      'support_agent'::text,
      v_staff_id,
      v_client_id,
      v_org_id,
      COALESCE(v_display_name, ''),
      v_can_reply,
      v_can_content,
      v_can_meetings;
  ELSIF v_role = 'client' OR v_client_id IS NOT NULL THEN
    RETURN QUERY SELECT 
      'client'::text,
      'client'::text,
      v_staff_id,
      v_client_id,
      v_org_id,
      COALESCE(v_display_name, ''),
      false,
      false,
      false;
  ELSE
    RETURN QUERY SELECT 
      'visitor'::text,
      NULL::text,
      NULL::uuid,
      NULL::uuid,
      NULL::uuid,
      COALESCE(v_display_name, ''),
      false,
      false,
      false;
  END IF;
END;
$$;