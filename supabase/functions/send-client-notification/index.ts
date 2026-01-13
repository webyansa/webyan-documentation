import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'ticket_reply' | 'ticket_status' | 'meeting_confirmed' | 'meeting_cancelled' | 'subscription_approved' | 'subscription_rejected';
  client_email: string;
  client_name: string;
  data: {
    ticket_number?: string;
    ticket_subject?: string;
    new_status?: string;
    reply_message?: string;
    meeting_subject?: string;
    meeting_date?: string;
    meeting_link?: string;
    subscription_plan?: string;
    admin_response?: string;
  };
}

const getEmailContent = (type: string, data: any, clientName: string) => {
  const baseStyle = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    direction: rtl;
    text-align: right;
  `;

  const headerStyle = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    text-align: center;
    border-radius: 10px 10px 0 0;
  `;

  const contentStyle = `
    background: #ffffff;
    padding: 30px;
    border: 1px solid #e5e7eb;
    border-top: none;
  `;

  const footerStyle = `
    background: #f9fafb;
    padding: 20px;
    text-align: center;
    border-radius: 0 0 10px 10px;
    border: 1px solid #e5e7eb;
    border-top: none;
    color: #6b7280;
    font-size: 14px;
  `;

  const buttonStyle = `
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 30px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: bold;
    margin: 20px 0;
  `;

  switch (type) {
    case 'ticket_reply':
      return {
        subject: `رد جديد على تذكرتك ${data.ticket_number}`,
        html: `
          <div style="${baseStyle}">
            <div style="${headerStyle}">
              <h1 style="margin: 0; font-size: 24px;">💬 رد جديد على تذكرتك</h1>
            </div>
            <div style="${contentStyle}">
              <p style="font-size: 18px; color: #1f2937;">مرحباً ${clientName}،</p>
              <p style="color: #4b5563; line-height: 1.8;">تم إضافة رد جديد على تذكرتك:</p>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #667eea;">
                <p style="margin: 0; color: #374151;"><strong>رقم التذكرة:</strong> ${data.ticket_number}</p>
                <p style="margin: 10px 0 0; color: #374151;"><strong>الموضوع:</strong> ${data.ticket_subject}</p>
              </div>
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 0; color: #92400e;">${data.reply_message}</p>
              </div>
              <a href="https://help.webyan.net/portal/tickets" style="${buttonStyle}">
                عرض التذكرة
              </a>
            </div>
            <div style="${footerStyle}">
              <p style="margin: 0;">فريق دعم ويبيان</p>
              <p style="margin: 5px 0 0;">support@webyan.net</p>
            </div>
          </div>
        `
      };

    case 'ticket_status':
      const statusLabels: Record<string, string> = {
        open: 'مفتوحة',
        in_progress: 'قيد المعالجة',
        resolved: 'تم الحل',
        closed: 'مغلقة'
      };
      const statusColors: Record<string, string> = {
        open: '#3b82f6',
        in_progress: '#f59e0b',
        resolved: '#10b981',
        closed: '#6b7280'
      };
      return {
        subject: `تحديث حالة التذكرة ${data.ticket_number}`,
        html: `
          <div style="${baseStyle}">
            <div style="${headerStyle}">
              <h1 style="margin: 0; font-size: 24px;">🔄 تحديث حالة التذكرة</h1>
            </div>
            <div style="${contentStyle}">
              <p style="font-size: 18px; color: #1f2937;">مرحباً ${clientName}،</p>
              <p style="color: #4b5563; line-height: 1.8;">تم تحديث حالة تذكرتك:</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center;">
                <p style="margin: 0; color: #374151;"><strong>رقم التذكرة:</strong> ${data.ticket_number}</p>
                <div style="display: inline-block; background: ${statusColors[data.new_status] || '#667eea'}; color: white; padding: 8px 20px; border-radius: 20px; margin-top: 15px; font-weight: bold;">
                  ${statusLabels[data.new_status] || data.new_status}
                </div>
              </div>
              <a href="https://help.webyan.net/portal/tickets" style="${buttonStyle}">
                عرض التذكرة
              </a>
            </div>
            <div style="${footerStyle}">
              <p style="margin: 0;">فريق دعم ويبيان</p>
            </div>
          </div>
        `
      };

    case 'meeting_confirmed':
      return {
        subject: `تأكيد موعد الاجتماع: ${data.meeting_subject}`,
        html: `
          <div style="${baseStyle}">
            <div style="${headerStyle}">
              <h1 style="margin: 0; font-size: 24px;">✅ تم تأكيد موعد اجتماعك</h1>
            </div>
            <div style="${contentStyle}">
              <p style="font-size: 18px; color: #1f2937;">مرحباً ${clientName}،</p>
              <p style="color: #4b5563; line-height: 1.8;">تم تأكيد موعد اجتماعك مع فريق ويبيان:</p>
              <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #10b981;">
                <p style="margin: 0; color: #065f46;"><strong>📋 الموضوع:</strong> ${data.meeting_subject}</p>
                <p style="margin: 10px 0; color: #065f46;"><strong>📅 الموعد:</strong> ${data.meeting_date}</p>
                ${data.meeting_link ? `<p style="margin: 10px 0 0; color: #065f46;"><strong>🔗 رابط الاجتماع:</strong> <a href="${data.meeting_link}" style="color: #667eea;">${data.meeting_link}</a></p>` : ''}
              </div>
              <a href="https://help.webyan.net/portal/meetings" style="${buttonStyle}">
                عرض الاجتماعات
              </a>
            </div>
            <div style="${footerStyle}">
              <p style="margin: 0;">نتطلع للقائك!</p>
              <p style="margin: 5px 0 0;">فريق ويبيان</p>
            </div>
          </div>
        `
      };

    case 'meeting_cancelled':
      return {
        subject: `إلغاء الاجتماع: ${data.meeting_subject}`,
        html: `
          <div style="${baseStyle}">
            <div style="${headerStyle}" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
              <h1 style="margin: 0; font-size: 24px;">❌ تم إلغاء الاجتماع</h1>
            </div>
            <div style="${contentStyle}">
              <p style="font-size: 18px; color: #1f2937;">مرحباً ${clientName}،</p>
              <p style="color: #4b5563; line-height: 1.8;">نأسف لإبلاغك بأنه تم إلغاء الاجتماع التالي:</p>
              <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #ef4444;">
                <p style="margin: 0; color: #991b1b;"><strong>📋 الموضوع:</strong> ${data.meeting_subject}</p>
                ${data.admin_response ? `<p style="margin: 10px 0 0; color: #991b1b;"><strong>📝 السبب:</strong> ${data.admin_response}</p>` : ''}
              </div>
              <p style="color: #4b5563;">يمكنك طلب موعد جديد من خلال بوابة العملاء.</p>
              <a href="https://help.webyan.net/portal/meetings/new" style="${buttonStyle}">
                طلب موعد جديد
              </a>
            </div>
            <div style="${footerStyle}">
              <p style="margin: 0;">فريق ويبيان</p>
            </div>
          </div>
        `
      };

    case 'subscription_approved':
      return {
        subject: `تم الموافقة على طلب الاشتراك`,
        html: `
          <div style="${baseStyle}">
            <div style="${headerStyle}">
              <h1 style="margin: 0; font-size: 24px;">🎉 تم الموافقة على طلب اشتراكك</h1>
            </div>
            <div style="${contentStyle}">
              <p style="font-size: 18px; color: #1f2937;">مرحباً ${clientName}،</p>
              <p style="color: #4b5563; line-height: 1.8;">يسعدنا إبلاغك بأنه تم الموافقة على طلب اشتراكك!</p>
              <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center;">
                <p style="margin: 0; color: #065f46; font-size: 20px;"><strong>الباقة: ${data.subscription_plan}</strong></p>
              </div>
              ${data.admin_response ? `<p style="color: #4b5563; background: #f3f4f6; padding: 15px; border-radius: 8px;">${data.admin_response}</p>` : ''}
              <a href="https://help.webyan.net/portal/subscription" style="${buttonStyle}">
                عرض تفاصيل الاشتراك
              </a>
            </div>
            <div style="${footerStyle}">
              <p style="margin: 0;">شكراً لثقتك بنا!</p>
              <p style="margin: 5px 0 0;">فريق ويبيان</p>
            </div>
          </div>
        `
      };

    case 'subscription_rejected':
      return {
        subject: `تحديث على طلب الاشتراك`,
        html: `
          <div style="${baseStyle}">
            <div style="${headerStyle}">
              <h1 style="margin: 0; font-size: 24px;">📋 تحديث على طلب اشتراكك</h1>
            </div>
            <div style="${contentStyle}">
              <p style="font-size: 18px; color: #1f2937;">مرحباً ${clientName}،</p>
              <p style="color: #4b5563; line-height: 1.8;">نأسف لإبلاغك بأنه لم نتمكن من الموافقة على طلب اشتراكك في الوقت الحالي.</p>
              ${data.admin_response ? `
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 0; color: #92400e;"><strong>ملاحظة:</strong> ${data.admin_response}</p>
              </div>
              ` : ''}
              <p style="color: #4b5563;">يمكنك التواصل معنا لمزيد من التفاصيل.</p>
              <a href="https://help.webyan.net/portal/messages" style="${buttonStyle}">
                تواصل معنا
              </a>
            </div>
            <div style="${footerStyle}">
              <p style="margin: 0;">فريق ويبيان</p>
            </div>
          </div>
        `
      };

    default:
      return {
        subject: 'إشعار من ويبيان',
        html: `<p>مرحباً ${clientName}، لديك إشعار جديد.</p>`
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, client_email, client_name, data }: NotificationRequest = await req.json();

    console.log('Sending client notification:', { type, client_email, client_name });

    const emailContent = getEmailContent(type, data, client_name);

    const emailResponse = await resend.emails.send({
      from: "ويبيان <support@webyan.net>",
      to: [client_email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Client notification sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending client notification:", error);
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