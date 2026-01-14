import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-embed-origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmbedTicketRequest {
  token: string;
  subject: string;
  description: string;
  category?: string;
  priority?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: EmbedTicketRequest = await req.json();
    const origin = req.headers.get('x-embed-origin') || req.headers.get('origin') || '';

    // Validate required fields
    if (!body.token || !body.subject || !body.description) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: token, subject, description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify token
    const { data: embedToken, error: tokenError } = await supabase
      .from('embed_tokens')
      .select('*, organization:client_organizations(id, name)')
      .eq('token', body.token)
      .eq('is_active', true)
      .single();

    if (tokenError || !embedToken) {
      console.log('Invalid token:', body.token);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or inactive token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (embedToken.expires_at && new Date(embedToken.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token has expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check allowed domains
    if (embedToken.allowed_domains && embedToken.allowed_domains.length > 0) {
      const originDomain = origin.replace(/^https?:\/\//, '').split('/')[0];
      const isAllowed = embedToken.allowed_domains.some((domain: string) => {
        if (domain.startsWith('*.')) {
          const baseDomain = domain.slice(2);
          return originDomain === baseDomain || originDomain.endsWith('.' + baseDomain);
        }
        return domain === originDomain || domain === origin;
      });

      if (!isAllowed) {
        console.log('Origin not allowed:', origin);
        return new Response(
          JSON.stringify({ success: false, error: 'Origin not allowed for this token' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate ticket number
    const ticketNumber = 'EMB-' + Math.floor(100000 + Math.random() * 900000);

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        ticket_number: ticketNumber,
        subject: body.subject.slice(0, 200), // Limit length
        description: body.description.slice(0, 5000), // Limit length
        category: body.category || 'technical',
        priority: body.priority || 'medium',
        guest_name: body.contactName?.slice(0, 100) || embedToken.organization?.name || 'عميل مضمن',
        guest_email: body.contactEmail?.slice(0, 255) || null,
        website_url: body.websiteUrl?.slice(0, 500) || null,
        status: 'open',
        admin_note: `تذكرة من نموذج مضمن - المنظمة: ${embedToken.organization?.name || 'غير معروف'}`
      })
      .select()
      .single();

    if (ticketError) {
      console.error('Error creating ticket:', ticketError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create ticket' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update token usage
    await supabase
      .from('embed_tokens')
      .update({
        usage_count: (embedToken.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', embedToken.id);

    console.log('Embed ticket created:', ticketNumber, 'for organization:', embedToken.organization_id);

    return new Response(
      JSON.stringify({
        success: true,
        ticketNumber: ticket.ticket_number,
        ticketId: ticket.id,
        message: 'تم إنشاء التذكرة بنجاح'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-embed-ticket:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
