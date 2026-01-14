import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get escalation settings
    const { data: settings } = await supabase
      .from('escalation_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!settings) {
      return new Response(
        JSON.stringify({ message: 'Escalation settings not found or disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const escalationHours = settings.escalation_hours || 24;
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - escalationHours);

    // Find tickets that need escalation
    const { data: ticketsToEscalate, error: ticketsError } = await supabase
      .from('support_tickets')
      .select(`
        *,
        assigned_staff:staff_members!support_tickets_assigned_to_staff_fkey(
          id, full_name, email
        )
      `)
      .eq('is_escalated', false)
      .in('status', ['open', 'in_progress'])
      .not('assigned_to_staff', 'is', null)
      .lt('updated_at', cutoffTime.toISOString());

    if (ticketsError) throw ticketsError;

    const escalatedTickets = [];

    for (const ticket of ticketsToEscalate || []) {
      // Check if there are any recent replies
      const { data: recentReplies } = await supabase
        .from('ticket_replies')
        .select('id')
        .eq('ticket_id', ticket.id)
        .gte('created_at', cutoffTime.toISOString())
        .limit(1);

      if (!recentReplies || recentReplies.length === 0) {
        // Mark ticket as escalated
        const { error: updateError } = await supabase
          .from('support_tickets')
          .update({
            is_escalated: true,
            escalated_at: new Date().toISOString(),
            escalation_reason: `لم يتم الرد على التذكرة خلال ${escalationHours} ساعة`,
            staff_status: 'escalated'
          })
          .eq('id', ticket.id);

        if (!updateError) {
          escalatedTickets.push(ticket);

          // Log the escalation
          await supabase.from('ticket_activity_log').insert({
            ticket_id: ticket.id,
            action_type: 'escalation',
            new_value: 'escalated',
            note: `تصعيد تلقائي: لم يتم الرد خلال ${escalationHours} ساعة`,
            is_staff_action: false
          });

          // Create notification for admins
          const { data: admins } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin');

          if (admins) {
            for (const admin of admins) {
              await supabase.from('user_notifications').insert({
                user_id: admin.user_id,
                title: '⚠️ تصعيد تذكرة',
                message: `تم تصعيد التذكرة ${ticket.ticket_number} - ${ticket.subject} لعدم الرد`,
                type: 'escalation'
              });
            }
          }

          // Send email to admins if enabled
          if (settings.notify_admin) {
            const { data: adminProfiles } = await supabase
              .from('profiles')
              .select('email')
              .in('id', admins?.map(a => a.user_id) || []);

            for (const admin of adminProfiles || []) {
              if (admin.email) {
                try {
                  await fetch(`${supabaseUrl}/functions/v1/send-ticket-notification`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${supabaseServiceKey}`
                    },
                    body: JSON.stringify({
                      email: admin.email,
                      ticketNumber: ticket.ticket_number,
                      subject: ticket.subject,
                      type: 'escalation',
                      message: `تم تصعيد التذكرة لعدم الرد خلال ${escalationHours} ساعة`
                    })
                  });
                } catch (e) {
                  console.error('Error sending email:', e);
                }
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Checked escalations successfully`,
        escalatedCount: escalatedTickets.length,
        escalatedTickets: escalatedTickets.map(t => t.ticket_number)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error checking escalations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
