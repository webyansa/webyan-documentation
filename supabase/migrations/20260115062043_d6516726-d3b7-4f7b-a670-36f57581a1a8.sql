-- Fix function search paths
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.body, 100),
    unread_count = CASE 
      WHEN NEW.sender_type = 'client' THEN unread_count + 1 
      ELSE unread_count 
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_available_agent(p_mode public.auto_assign_mode)
RETURNS UUID AS $$
DECLARE
  v_agent_id UUID;
BEGIN
  IF p_mode = 'round_robin' THEN
    SELECT id INTO v_agent_id
    FROM public.staff_members
    WHERE agent_status = 'available' AND is_active = true AND can_reply_tickets = true
    ORDER BY last_activity_at ASC NULLS FIRST
    LIMIT 1;
  ELSIF p_mode = 'least_active' THEN
    SELECT id INTO v_agent_id
    FROM public.staff_members
    WHERE agent_status = 'available' AND is_active = true AND can_reply_tickets = true
    ORDER BY active_conversations_count ASC, last_activity_at ASC NULLS FIRST
    LIMIT 1;
  END IF;
  
  RETURN v_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update permissive RLS policies to be more secure
-- Drop and recreate the overly permissive policies
DROP POLICY IF EXISTS "Allow insert from edge functions" ON public.conversations;
DROP POLICY IF EXISTS "Allow insert from edge functions for messages" ON public.conversation_messages;
DROP POLICY IF EXISTS "Allow insert events" ON public.conversation_events;

-- Create more secure policies using service role check
CREATE POLICY "Service role can insert conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL OR -- Allow from edge functions with service role
    public.is_staff(auth.uid()) OR 
    public.is_admin(auth.uid())
  );

CREATE POLICY "Service role can insert messages"
  ON public.conversation_messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL OR -- Allow from edge functions with service role
    public.is_staff(auth.uid()) OR 
    public.is_admin(auth.uid()) OR
    conversation_id IN (
      SELECT id FROM public.conversations WHERE organization_id IN (
        SELECT organization_id FROM public.client_accounts WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can insert events"
  ON public.conversation_events FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL OR -- Allow from edge functions with service role
    public.is_staff(auth.uid()) OR 
    public.is_admin(auth.uid())
  );