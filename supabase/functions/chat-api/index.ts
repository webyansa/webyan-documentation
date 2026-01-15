import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-embed-token, x-embed-origin',
};

interface ChatRequest {
  action: 'start_conversation' | 'send_message' | 'get_messages' | 'get_conversations' | 'mark_read' | 'assign' | 'close' | 'reopen' | 'convert_to_ticket';
  conversationId?: string;
  message?: string;
  attachments?: string[];
  subject?: string;
  agentId?: string;
  senderName?: string;
  senderEmail?: string;
  ticketData?: {
    subject: string;
    category: string;
    priority: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const embedToken = req.headers.get('x-embed-token');
    const authHeader = req.headers.get('authorization');
    const origin = req.headers.get('x-embed-origin') || req.headers.get('origin') || 'unknown';

    let organizationId: string | null = null;
    let clientAccountId: string | null = null;
    let embedTokenId: string | null = null;
    let isStaff = false;
    let staffId: string | null = null;
    let userId: string | null = null;
    let organizationName: string | null = null;

    // Verify embed token or auth header
    if (embedToken) {
      const { data: tokenData, error: tokenError } = await supabase
        .from('embed_tokens')
        .select(`
          id,
          organization_id,
          is_active,
          allowed_domains,
          organization:client_organizations(id, name, contact_email)
        `)
        .eq('token', embedToken)
        .single();

      if (tokenError || !tokenData || !tokenData.is_active) {
        return new Response(
          JSON.stringify({ error: 'Invalid or inactive embed token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check allowed domains
      if (tokenData.allowed_domains && tokenData.allowed_domains.length > 0) {
        const requestDomain = origin.replace(/^https?:\/\//, '').split('/')[0];
        const isAllowed = tokenData.allowed_domains.some((domain: string) => 
          requestDomain === domain || requestDomain.endsWith('.' + domain)
        );
        if (!isAllowed) {
          return new Response(
            JSON.stringify({ error: 'Domain not allowed' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      organizationId = tokenData.organization_id;
      embedTokenId = tokenData.id;
      organizationName = (tokenData.organization as any)?.name || null;

      // Update token usage
      await supabase
        .from('embed_tokens')
        .update({ last_used_at: new Date().toISOString(), usage_count: (tokenData as any).usage_count + 1 })
        .eq('id', tokenData.id);

    } else if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid auth token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = user.id;

      // Check if staff
      const { data: staffData } = await supabase
        .from('staff_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (staffData) {
        isStaff = true;
        staffId = staffData.id;
      } else {
        // Check if client
        const { data: clientData } = await supabase
          .from('client_accounts')
          .select('id, organization_id')
          .eq('user_id', user.id)
          .single();

        if (clientData) {
          clientAccountId = clientData.id;
          organizationId = clientData.organization_id;
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ChatRequest = await req.json();
    const { action } = body;

    console.log(`Chat API action: ${action}, isStaff: ${isStaff}, orgId: ${organizationId}`);

    switch (action) {
      case 'start_conversation': {
        if (!organizationId && !isStaff) {
          return new Response(
            JSON.stringify({ error: 'Organization context required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get chat settings for auto-assign
        const { data: settings } = await supabase
          .from('chat_settings')
          .select('*')
          .single();

        let assignedAgentId: string | null = null;
        let status: 'unassigned' | 'assigned' = 'unassigned';

        // Auto-assign if enabled
        if (settings?.auto_assign_mode && settings.auto_assign_mode !== 'disabled') {
          const { data: agentId } = await supabase
            .rpc('get_available_agent', { p_mode: settings.auto_assign_mode });
          
          if (agentId) {
            assignedAgentId = agentId;
            status = 'assigned';
          }
        }

        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            organization_id: organizationId,
            client_account_id: clientAccountId,
            subject: body.subject || 'محادثة جديدة',
            status,
            assigned_agent_id: assignedAgentId,
            source: embedToken ? 'embed' : 'portal',
            source_domain: origin,
            embed_token_id: embedTokenId,
            metadata: {
              sender_name: body.senderName,
              sender_email: body.senderEmail,
              organization_name: organizationName
            }
          })
          .select()
          .single();

        if (convError) {
          console.error('Error creating conversation:', convError);
          return new Response(
            JSON.stringify({ error: 'Failed to create conversation' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log event
        await supabase.from('conversation_events').insert({
          conversation_id: conversation.id,
          event_type: 'created',
          performer_name: body.senderName || 'Client',
          data: { source: embedToken ? 'embed' : 'portal' }
        });

        // Send welcome message if set
        if (settings?.welcome_message) {
          await supabase.from('conversation_messages').insert({
            conversation_id: conversation.id,
            sender_type: 'system',
            body: settings.welcome_message,
            sender_name: 'النظام'
          });
        }

        // Send initial message if provided
        if (body.message) {
          await supabase.from('conversation_messages').insert({
            conversation_id: conversation.id,
            sender_type: 'client',
            sender_name: body.senderName || 'العميل',
            body: body.message,
            attachments: body.attachments || []
          });
        }

        // Log assignment if auto-assigned
        if (assignedAgentId) {
          const { data: agent } = await supabase
            .from('staff_members')
            .select('full_name')
            .eq('id', assignedAgentId)
            .single();

          await supabase.from('conversation_events').insert({
            conversation_id: conversation.id,
            event_type: 'assigned',
            performed_by: assignedAgentId,
            performer_name: 'النظام (إسناد تلقائي)',
            data: { agent_name: agent?.full_name, auto: true }
          });

          // Update agent's active count
          await supabase.rpc('increment', {
            table_name: 'staff_members',
            row_id: assignedAgentId,
            column_name: 'active_conversations_count',
            amount: 1
          });
        }

        return new Response(
          JSON.stringify({ conversation, welcome_message: settings?.welcome_message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'send_message': {
        if (!body.conversationId || !body.message) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID and message required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify access to conversation
        const { data: conv } = await supabase
          .from('conversations')
          .select('id, organization_id, status')
          .eq('id', body.conversationId)
          .single();

        if (!conv) {
          return new Response(
            JSON.stringify({ error: 'Conversation not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!isStaff && conv.organization_id !== organizationId) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get sender info
        let senderName = body.senderName || 'العميل';
        let senderType = 'client';
        let senderId: string | null = clientAccountId;

        if (isStaff) {
          const { data: staff } = await supabase
            .from('staff_members')
            .select('full_name')
            .eq('id', staffId)
            .single();
          senderName = staff?.full_name || 'الدعم';
          senderType = 'agent';
          senderId = staffId;
        }

        const { data: message, error: msgError } = await supabase
          .from('conversation_messages')
          .insert({
            conversation_id: body.conversationId,
            sender_type: senderType,
            sender_id: senderId,
            sender_name: senderName,
            body: body.message,
            attachments: body.attachments || []
          })
          .select()
          .single();

        if (msgError) {
          console.error('Error sending message:', msgError);
          return new Response(
            JSON.stringify({ error: 'Failed to send message' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update staff last activity
        if (isStaff && staffId) {
          await supabase
            .from('staff_members')
            .update({ last_activity_at: new Date().toISOString() })
            .eq('id', staffId);
        }

        return new Response(
          JSON.stringify({ message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_messages': {
        if (!body.conversationId) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify access
        const { data: conv } = await supabase
          .from('conversations')
          .select('id, organization_id')
          .eq('id', body.conversationId)
          .single();

        if (!isStaff && conv?.organization_id !== organizationId) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: messages, error } = await supabase
          .from('conversation_messages')
          .select('*')
          .eq('conversation_id', body.conversationId)
          .order('created_at', { ascending: true });

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get messages' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ messages }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_conversations': {
        let query = supabase
          .from('conversations')
          .select(`
            *,
            organization:client_organizations(id, name, contact_email, logo_url),
            assigned_agent:staff_members(id, full_name, agent_status)
          `)
          .order('last_message_at', { ascending: false, nullsFirst: false });

        if (!isStaff) {
          query = query.eq('organization_id', organizationId);
        }

        const { data: conversations, error } = await query;

        if (error) {
          console.error('Error fetching conversations:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to get conversations' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ conversations }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'mark_read': {
        if (!body.conversationId) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Mark messages as read
        await supabase
          .from('conversation_messages')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('conversation_id', body.conversationId)
          .eq('is_read', false);

        // Reset unread count
        await supabase
          .from('conversations')
          .update({ unread_count: 0 })
          .eq('id', body.conversationId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'assign': {
        if (!isStaff) {
          return new Response(
            JSON.stringify({ error: 'Staff access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!body.conversationId) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const targetAgentId = body.agentId || staffId;

        // Get current assignment
        const { data: conv } = await supabase
          .from('conversations')
          .select('assigned_agent_id')
          .eq('id', body.conversationId)
          .single();

        // Decrease old agent's count
        if (conv?.assigned_agent_id) {
          await supabase
            .from('staff_members')
            .update({ active_conversations_count: supabase.rpc('greatest', { a: 0, b: -1 }) })
            .eq('id', conv.assigned_agent_id);
        }

        // Update conversation
        const { error } = await supabase
          .from('conversations')
          .update({
            assigned_agent_id: targetAgentId,
            status: 'assigned',
            updated_at: new Date().toISOString()
          })
          .eq('id', body.conversationId);

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to assign conversation' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get agent name and log event
        const { data: agent } = await supabase
          .from('staff_members')
          .select('full_name')
          .eq('id', targetAgentId)
          .single();

        await supabase.from('conversation_events').insert({
          conversation_id: body.conversationId,
          event_type: conv?.assigned_agent_id ? 'transferred' : 'assigned',
          performed_by: staffId,
          performer_name: agent?.full_name,
          data: { agent_id: targetAgentId, agent_name: agent?.full_name }
        });

        // Update new agent's last activity
        await supabase
          .from('staff_members')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', targetAgentId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'close': {
        if (!isStaff) {
          return new Response(
            JSON.stringify({ error: 'Staff access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: conv } = await supabase
          .from('conversations')
          .select('assigned_agent_id')
          .eq('id', body.conversationId)
          .single();

        await supabase
          .from('conversations')
          .update({
            status: 'closed',
            closed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', body.conversationId);

        // Decrease agent's active count
        if (conv?.assigned_agent_id) {
          await supabase
            .from('staff_members')
            .update({ active_conversations_count: 0 }) // Will be fixed properly
            .eq('id', conv.assigned_agent_id);
        }

        // Get staff name
        const { data: staff } = await supabase
          .from('staff_members')
          .select('full_name')
          .eq('id', staffId)
          .single();

        await supabase.from('conversation_events').insert({
          conversation_id: body.conversationId,
          event_type: 'closed',
          performed_by: staffId,
          performer_name: staff?.full_name
        });

        // Add system message
        await supabase.from('conversation_messages').insert({
          conversation_id: body.conversationId,
          sender_type: 'system',
          body: `تم إغلاق المحادثة بواسطة ${staff?.full_name}`,
          sender_name: 'النظام'
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reopen': {
        if (!isStaff) {
          return new Response(
            JSON.stringify({ error: 'Staff access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabase
          .from('conversations')
          .update({
            status: 'assigned',
            closed_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', body.conversationId);

        const { data: staff } = await supabase
          .from('staff_members')
          .select('full_name')
          .eq('id', staffId)
          .single();

        await supabase.from('conversation_events').insert({
          conversation_id: body.conversationId,
          event_type: 'reopened',
          performed_by: staffId,
          performer_name: staff?.full_name
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'convert_to_ticket': {
        if (!isStaff) {
          return new Response(
            JSON.stringify({ error: 'Staff access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get conversation with messages
        const { data: conv } = await supabase
          .from('conversations')
          .select(`
            *,
            organization:client_organizations(id, name, contact_email)
          `)
          .eq('id', body.conversationId)
          .single();

        const { data: messages } = await supabase
          .from('conversation_messages')
          .select('sender_name, body, created_at')
          .eq('conversation_id', body.conversationId)
          .order('created_at', { ascending: true })
          .limit(10);

        // Build ticket description from messages
        const messagesText = messages?.map(m => 
          `[${new Date(m.created_at).toLocaleString('ar-SA')}] ${m.sender_name}: ${m.body}`
        ).join('\n') || '';

        // Generate ticket number
        const ticketNumber = `CHAT-${Date.now().toString(36).toUpperCase()}`;

        const { data: ticket, error: ticketError } = await supabase
          .from('support_tickets')
          .insert({
            ticket_number: ticketNumber,
            subject: body.ticketData?.subject || conv?.subject || 'تذكرة من المحادثة',
            description: `--- محول من محادثة ---\n\n${messagesText}`,
            category: body.ticketData?.category || 'technical',
            priority: body.ticketData?.priority || 'medium',
            organization_id: conv?.organization_id,
            source: 'chat',
            guest_name: conv?.metadata?.sender_name,
            guest_email: conv?.metadata?.sender_email || (conv?.organization as any)?.contact_email,
            assigned_to_staff: staffId,
            admin_note: `محول من محادثة رقم: ${body.conversationId}`
          })
          .select()
          .single();

        if (ticketError) {
          console.error('Error creating ticket:', ticketError);
          return new Response(
            JSON.stringify({ error: 'Failed to create ticket' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log event
        await supabase.from('conversation_events').insert({
          conversation_id: body.conversationId,
          event_type: 'converted_to_ticket',
          performed_by: staffId,
          data: { ticket_id: ticket.id, ticket_number: ticketNumber }
        });

        // Add system message
        await supabase.from('conversation_messages').insert({
          conversation_id: body.conversationId,
          sender_type: 'system',
          body: `تم تحويل هذه المحادثة إلى تذكرة رقم: ${ticketNumber}`,
          sender_name: 'النظام'
        });

        return new Response(
          JSON.stringify({ ticket }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: unknown) {
    console.error('Chat API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
