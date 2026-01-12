import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TrackTicketRequest {
  ticketNumber: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { ticketNumber, email }: TrackTicketRequest = await req.json();

    // Validate inputs
    if (!ticketNumber || !email) {
      return new Response(
        JSON.stringify({ error: "رقم التذكرة والبريد الإلكتروني مطلوبان" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const ticketNumberClean = ticketNumber.trim().toUpperCase();
    const emailClean = email.trim().toLowerCase();

    console.log(`Tracking ticket ${ticketNumberClean} for ${emailClean}`);

    // First try to find ticket by guest_email
    let { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("ticket_number", ticketNumberClean)
      .eq("guest_email", emailClean)
      .maybeSingle();

    // If not found, try to find by user profile email
    if (!ticket) {
      console.log("Ticket not found by guest_email, trying profiles...");
      
      // Find user by email in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", emailClean)
        .maybeSingle();

      if (profile) {
        console.log(`Found profile for ${emailClean}, user_id: ${profile.id}`);
        
        // Find ticket by user_id
        const { data: userTicket, error: userTicketError } = await supabase
          .from("support_tickets")
          .select("*")
          .eq("ticket_number", ticketNumberClean)
          .eq("user_id", profile.id)
          .maybeSingle();

        if (userTicket) {
          ticket = userTicket;
          console.log(`Found ticket ${ticketNumberClean} for user ${profile.id}`);
        }
      }
    }

    if (!ticket) {
      console.log("Ticket not found");
      return new Response(
        JSON.stringify({ error: "لم يتم العثور على التذكرة. تأكد من صحة البيانات." }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get replies for this ticket
    const { data: replies, error: repliesError } = await supabase
      .from("ticket_replies")
      .select("id, message, is_staff_reply, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    if (repliesError) {
      console.error("Error fetching replies:", repliesError);
    }

    console.log(`Found ticket ${ticketNumberClean} with ${replies?.length || 0} replies`);

    return new Response(
      JSON.stringify({ 
        ticket: {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          resolved_at: ticket.resolved_at,
        },
        replies: replies || [] 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in track-guest-ticket:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
