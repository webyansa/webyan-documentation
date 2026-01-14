-- Create ticket activity log table for tracking all updates
CREATE TABLE IF NOT EXISTS public.ticket_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'status_change', 'reply', 'assignment', 'escalation', 'note'
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  performed_by UUID,
  performed_by_name TEXT,
  is_staff_action BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meeting activity log table
CREATE TABLE IF NOT EXISTS public.meeting_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meeting_requests(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'status_change', 'assignment', 'report_submitted', 'note'
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  recommendation TEXT,
  performed_by UUID,
  performed_by_name TEXT,
  is_staff_action BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add escalation fields to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS staff_status TEXT DEFAULT 'new'; -- new, reviewing, working, awaiting_response, completed, escalated

-- Add staff-specific fields to meeting_requests
ALTER TABLE public.meeting_requests
ADD COLUMN IF NOT EXISTS staff_recommendation TEXT,
ADD COLUMN IF NOT EXISTS meeting_outcome TEXT DEFAULT 'pending', -- pending, successful, failed, rescheduled_by_client, no_show
ADD COLUMN IF NOT EXISTS staff_notes TEXT,
ADD COLUMN IF NOT EXISTS report_submitted_at TIMESTAMP WITH TIME ZONE;

-- Create escalation settings table
CREATE TABLE IF NOT EXISTS public.escalation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escalation_hours INTEGER NOT NULL DEFAULT 24,
  notify_admin BOOLEAN DEFAULT true,
  notify_staff BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default escalation settings
INSERT INTO public.escalation_settings (escalation_hours, notify_admin, notify_staff, is_active)
VALUES (24, true, true, true)
ON CONFLICT DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.ticket_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for ticket_activity_log
CREATE POLICY "Admins can manage ticket activity logs" ON public.ticket_activity_log
FOR ALL USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view logs for assigned tickets" ON public.ticket_activity_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM support_tickets st
    JOIN staff_members sm ON sm.id = st.assigned_to_staff
    WHERE st.id = ticket_activity_log.ticket_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
  )
);

CREATE POLICY "Staff can insert logs for assigned tickets" ON public.ticket_activity_log
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets st
    JOIN staff_members sm ON sm.id = st.assigned_to_staff
    WHERE st.id = ticket_activity_log.ticket_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
  )
);

CREATE POLICY "Users can view logs for their tickets" ON public.ticket_activity_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM support_tickets st
    WHERE st.id = ticket_activity_log.ticket_id
    AND st.user_id = auth.uid()
  )
);

-- RLS policies for meeting_activity_log
CREATE POLICY "Admins can manage meeting activity logs" ON public.meeting_activity_log
FOR ALL USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view logs for assigned meetings" ON public.meeting_activity_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM meeting_requests mr
    JOIN staff_members sm ON sm.id = mr.assigned_staff
    WHERE mr.id = meeting_activity_log.meeting_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
  )
);

CREATE POLICY "Staff can insert logs for assigned meetings" ON public.meeting_activity_log
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM meeting_requests mr
    JOIN staff_members sm ON sm.id = mr.assigned_staff
    WHERE mr.id = meeting_activity_log.meeting_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
  )
);

CREATE POLICY "Clients can view logs for their meetings" ON public.meeting_activity_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM meeting_requests mr
    JOIN client_accounts ca ON ca.organization_id = mr.organization_id
    WHERE mr.id = meeting_activity_log.meeting_id
    AND ca.user_id = auth.uid()
  )
);

-- RLS policies for escalation_settings
CREATE POLICY "Admins can manage escalation settings" ON public.escalation_settings
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view escalation settings" ON public.escalation_settings
FOR SELECT USING (true);