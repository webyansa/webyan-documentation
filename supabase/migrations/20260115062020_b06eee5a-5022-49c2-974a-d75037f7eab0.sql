-- Create agent presence status enum
CREATE TYPE public.agent_status AS ENUM ('available', 'busy', 'offline');

-- Create conversation status enum  
CREATE TYPE public.conversation_status AS ENUM ('unassigned', 'assigned', 'closed');

-- Create auto-assign mode enum
CREATE TYPE public.auto_assign_mode AS ENUM ('disabled', 'round_robin', 'least_active', 'by_team');

-- Add status column to staff_members for presence
ALTER TABLE public.staff_members 
ADD COLUMN IF NOT EXISTS agent_status public.agent_status DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS active_conversations_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  client_account_id UUID REFERENCES public.client_accounts(id) ON DELETE SET NULL,
  subject TEXT,
  status public.conversation_status DEFAULT 'unassigned',
  assigned_agent_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'embed',
  source_domain TEXT,
  embed_token_id UUID REFERENCES public.embed_tokens(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  unread_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create messages table
CREATE TABLE public.conversation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'agent', 'system')),
  sender_id UUID,
  sender_name TEXT,
  body TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation events table for activity tracking
CREATE TABLE public.conversation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'assigned', 'transferred', 'closed', 'reopened', 'converted_to_ticket')),
  performed_by UUID,
  performer_name TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quick replies table
CREATE TABLE public.quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  shortcut TEXT,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat settings table
CREATE TABLE public.chat_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auto_assign_mode public.auto_assign_mode DEFAULT 'disabled',
  welcome_message TEXT DEFAULT 'مرحباً! كيف يمكننا مساعدتك اليوم؟',
  offline_message TEXT DEFAULT 'عذراً، فريق الدعم غير متاح حالياً. سنرد عليك في أقرب وقت.',
  business_hours_enabled BOOLEAN DEFAULT false,
  business_hours JSONB DEFAULT '{}',
  sound_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default chat settings
INSERT INTO public.chat_settings (id) VALUES (gen_random_uuid());

-- Create indexes
CREATE INDEX idx_conversations_organization ON public.conversations(organization_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_assigned_agent ON public.conversations(assigned_agent_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation ON public.conversation_messages(conversation_id);
CREATE INDEX idx_messages_created ON public.conversation_messages(created_at DESC);
CREATE INDEX idx_staff_agent_status ON public.staff_members(agent_status);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Staff can view all conversations"
  ON public.conversations FOR SELECT
  USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Staff can update conversations"
  ON public.conversations FOR UPDATE
  USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Clients can view their organization conversations"
  ON public.conversations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.client_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow insert from edge functions"
  ON public.conversations FOR INSERT
  WITH CHECK (true);

-- RLS Policies for messages
CREATE POLICY "Staff can view all messages"
  ON public.conversation_messages FOR SELECT
  USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Staff can insert messages"
  ON public.conversation_messages FOR INSERT
  WITH CHECK (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Clients can view their conversation messages"
  ON public.conversation_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE organization_id IN (
        SELECT organization_id FROM public.client_accounts WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Clients can insert messages to their conversations"
  ON public.conversation_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE organization_id IN (
        SELECT organization_id FROM public.client_accounts WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Allow insert from edge functions for messages"
  ON public.conversation_messages FOR INSERT
  WITH CHECK (true);

-- RLS Policies for events
CREATE POLICY "Staff can view conversation events"
  ON public.conversation_events FOR SELECT
  USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Allow insert events"
  ON public.conversation_events FOR INSERT
  WITH CHECK (true);

-- RLS Policies for quick replies
CREATE POLICY "Staff can manage their quick replies"
  ON public.quick_replies FOR ALL
  USING (staff_id IN (SELECT id FROM public.staff_members WHERE user_id = auth.uid()) OR is_global = true);

CREATE POLICY "Admin can manage all quick replies"
  ON public.quick_replies FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for chat settings
CREATE POLICY "Staff can view chat settings"
  ON public.chat_settings FOR SELECT
  USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Admin can update chat settings"
  ON public.chat_settings FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Enable realtime for conversations and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;

-- Function to update conversation on new message
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message();

-- Function to get available agent for auto-assign
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
$$ LANGUAGE plpgsql SECURITY DEFINER;