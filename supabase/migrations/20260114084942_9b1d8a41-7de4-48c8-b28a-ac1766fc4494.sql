-- Create staff_members table
CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  job_title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  can_reply_tickets BOOLEAN NOT NULL DEFAULT false,
  can_manage_content BOOLEAN NOT NULL DEFAULT false,
  can_attend_meetings BOOLEAN NOT NULL DEFAULT false,
  assigned_tickets_count INTEGER DEFAULT 0,
  completed_meetings_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_members
CREATE POLICY "Admins can manage staff"
  ON public.staff_members
  FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Staff can view their own record"
  ON public.staff_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Add assigned_to_staff column to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS assigned_to_staff UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

-- Add admin_note column to support_tickets for manager notes
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- Add closure_report column to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS closure_report TEXT;

-- Add assigned_staff column to meeting_requests
ALTER TABLE public.meeting_requests 
ADD COLUMN IF NOT EXISTS assigned_staff UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

-- Add closure_report to meeting_requests
ALTER TABLE public.meeting_requests 
ADD COLUMN IF NOT EXISTS closure_report TEXT;

-- Create trigger to update updated_at
CREATE OR REPLACE TRIGGER update_staff_members_updated_at
BEFORE UPDATE ON public.staff_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add policy for staff to view assigned tickets
CREATE POLICY "Staff can view assigned tickets"
  ON public.support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members 
      WHERE staff_members.user_id = auth.uid() 
      AND staff_members.id = support_tickets.assigned_to_staff
      AND staff_members.is_active = true
    )
  );

-- Add policy for staff to update assigned tickets
CREATE POLICY "Staff can update assigned tickets"
  ON public.support_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members 
      WHERE staff_members.user_id = auth.uid() 
      AND staff_members.id = support_tickets.assigned_to_staff
      AND staff_members.is_active = true
      AND staff_members.can_reply_tickets = true
    )
  );

-- Add policy for staff to view assigned meetings
CREATE POLICY "Staff can view assigned meetings"
  ON public.meeting_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members 
      WHERE staff_members.user_id = auth.uid() 
      AND staff_members.id = meeting_requests.assigned_staff
      AND staff_members.is_active = true
    )
  );

-- Add policy for staff to update assigned meetings
CREATE POLICY "Staff can update assigned meetings"
  ON public.meeting_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members 
      WHERE staff_members.user_id = auth.uid() 
      AND staff_members.id = meeting_requests.assigned_staff
      AND staff_members.is_active = true
      AND staff_members.can_attend_meetings = true
    )
  );

-- Function to check if user is staff
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.staff_members
        WHERE user_id = _user_id
        AND is_active = true
    )
$$;

-- Function to get staff permissions
CREATE OR REPLACE FUNCTION public.get_staff_permissions(_user_id uuid)
 RETURNS TABLE (
   staff_id uuid,
   can_reply_tickets boolean,
   can_manage_content boolean,
   can_attend_meetings boolean
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
    SELECT id, can_reply_tickets, can_manage_content, can_attend_meetings
    FROM public.staff_members
    WHERE user_id = _user_id
    AND is_active = true
    LIMIT 1
$$;