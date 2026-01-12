import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TicketNotificationRequest {
  email: string;
  ticketNumber: string;
  subject: string;
  type: 'created' | 'reply' | 'resolved' | 'status_update';
  message?: string;
  newStatus?: string;
  siteUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, ticketNumber, subject, type, message, newStatus, siteUrl }: TicketNotificationRequest = await req.json();

    if (!email) {
      console.log("No email provided, skipping notification");
      return new Response(JSON.stringify({ message: "No email provided" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending ticket notification to ${email} for ticket ${ticketNumber}, type: ${type}`);

    const statusLabels: Record<string, string> = {
      open: 'مفتوحة',
      in_progress: 'قيد المعالجة',
      resolved: 'تم الحل',
      closed: 'مغلقة',
    };

    const subjects: Record<string, string> = {
      created: `تم استلام تذكرتك رقم ${ticketNumber}`,
      reply: `رد جديد على التذكرة ${ticketNumber}`,
      resolved: `تم حل التذكرة ${ticketNumber}`,
      status_update: `تحديث حالة التذكرة ${ticketNumber}`,
    };

    const titles: Record<string, string> = {
      created: 'تم استلام تذكرتك بنجاح! ✅',
      reply: 'لديك رد جديد على تذكرتك 💬',
      resolved: 'تم حل تذكرتك! 🎉',
      status_update: `تم تحديث حالة تذكرتك إلى: ${statusLabels[newStatus || ''] || newStatus} 📋`,
    };

    const messages: Record<string, string> = {
      created: 'تم استلام طلب الدعم الخاص بك وسيتم الرد عليه في أقرب وقت ممكن.',
      reply: message || 'تم إضافة رد جديد على تذكرتك، يرجى مراجعة التذكرة للاطلاع على التفاصيل.',
      resolved: 'تم حل المشكلة المذكورة في تذكرتك. إذا كان لديك أي استفسارات إضافية، لا تتردد في فتح تذكرة جديدة.',
      status_update: `تم تغيير حالة تذكرتك إلى "${statusLabels[newStatus || ''] || newStatus}". يرجى متابعة التذكرة للاطلاع على آخر المستجدات.`,
    };

    // Use siteUrl if provided, otherwise fallback to a default
    const baseUrl = siteUrl || 'https://docs.webyan.net';

    const emailResponse = await resend.emails.send({
      from: "دعم ويبيان <support@webyan.net>",
      to: [email],
      subject: subjects[type],
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .ticket-badge { background: rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 15px; font-size: 14px; }
            .content { padding: 30px; }
            .info-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #1e3a5f; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .label { color: #6b7280; }
            .value { color: #1f2937; font-weight: 600; }
            .message { color: #6b7280; line-height: 1.8; margin: 20px 0; }
            .reply-box { background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #0284c7; }
            .reply-box p { margin: 0; color: #0369a1; }
            .button { display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
            .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${titles[type]}</h1>
              <div class="ticket-badge">${ticketNumber}</div>
            </div>
            <div class="content">
              <div class="info-box">
                <div class="info-row">
                  <span class="label">رقم التذكرة:</span>
                  <span class="value">${ticketNumber}</span>
                </div>
                <div class="info-row">
                  <span class="label">الموضوع:</span>
                  <span class="value">${subject}</span>
                </div>
              </div>
              ${type === 'reply' && message ? `
              <div class="reply-box">
                <p><strong>الرد:</strong></p>
                <p>${message}</p>
              </div>
              ` : ''}
              <p class="message">${messages[type]}</p>
              <div style="text-align: center;">
                <a href="${baseUrl}/track-ticket" class="button">تتبع التذكرة</a>
              </div>
            </div>
            <div class="footer">
              <p>فريق دعم ويبيان</p>
              <p>© 2024 ويبيان - جميع الحقوق محفوظة</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Ticket notification sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending ticket notification:", error);
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
