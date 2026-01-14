import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffNotificationRequest {
  type: 'ticket_assigned' | 'meeting_assigned' | 'new_reply';
  staff_email: string;
  staff_name: string;
  data: {
    ticket_number?: string;
    ticket_subject?: string;
    meeting_subject?: string;
    meeting_date?: string;
    organization_name?: string;
    admin_note?: string;
    reply_from?: string;
    reply_message?: string;
  };
}

const getEmailContent = (type: string, data: any, staffName: string) => {
  const baseStyle = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    direction: rtl;
    text-align: right;
  `;

  const headerStyle = `
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
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
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    padding: 12px 30px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: bold;
    margin: 20px 0;
  `;

  const alertBoxStyle = `
    background: #fef3c7;
    border: 2px solid #f59e0b;
    border-radius: 8px;
    padding: 15px;
    margin: 15px 0;
  `;

  switch (type) {
    case 'ticket_assigned':
      return {
        subject: `🎫 تذكرة جديدة موجهة إليك: ${data.ticket_number}`,
        html: `
          <div style="${baseStyle}">
            <div style="${headerStyle}">
              <h1 style="margin: 0; font-size: 24px;">🎫 تذكرة جديدة موجهة إليك</h1>
            </div>
            <div style="${contentStyle}">
              <p style="font-size: 18px; color: #1f2937;">مرحباً ${staffName}،</p>
              <p style="color: #4b5563; line-height: 1.8;">تم توجيه تذكرة دعم جديدة إليك. يرجى مراجعتها والتعامل معها:</p>
              
              <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #3b82f6;">
                <p style="margin: 0; color: #1e40af;"><strong>📌 رقم التذكرة:</strong> ${data.ticket_number}</p>
                <p style="margin: 10px 0 0; color: #1e40af;"><strong>📋 الموضوع:</strong> ${data.ticket_subject}</p>
                ${data.organization_name ? `<p style="margin: 10px 0 0; color: #1e40af;"><strong>🏢 المؤسسة:</strong> ${data.organization_name}</p>` : ''}
              </div>
              
              ${data.admin_note ? `
              <div style="${alertBoxStyle}">
                <p style="margin: 0; color: #92400e;"><strong>📝 ملاحظة من الإدارة:</strong></p>
                <p style="margin: 10px 0 0; color: #92400e;">${data.admin_note}</p>
              </div>
              ` : ''}
              
              <a href="https://help.webyan.net/staff/tickets" style="${buttonStyle}">
                فتح لوحة التذاكر
              </a>
            </div>
            <div style="${footerStyle}">
              <p style="margin: 0;">فريق إدارة ويبيان</p>
            </div>
          </div>
        `
      };

    case 'meeting_assigned':
      return {
        subject: `📅 اجتماع جديد موجه إليك: ${data.meeting_subject}`,
        html: `
          <div style="${baseStyle}">
            <div style="${headerStyle}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
              <h1 style="margin: 0; font-size: 24px;">📅 اجتماع جديد موجه إليك</h1>
            </div>
            <div style="${contentStyle}">
              <p style="font-size: 18px; color: #1f2937;">مرحباً ${staffName}،</p>
              <p style="color: #4b5563; line-height: 1.8;">تم توجيه اجتماع جديد إليك. يرجى التحضير والحضور في الموعد المحدد:</p>
              
              <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #10b981;">
                <p style="margin: 0; color: #065f46;"><strong>📋 الموضوع:</strong> ${data.meeting_subject}</p>
                ${data.meeting_date ? `<p style="margin: 10px 0 0; color: #065f46;"><strong>📅 الموعد:</strong> ${data.meeting_date}</p>` : ''}
                ${data.organization_name ? `<p style="margin: 10px 0 0; color: #065f46;"><strong>🏢 المؤسسة:</strong> ${data.organization_name}</p>` : ''}
              </div>
              
              ${data.admin_note ? `
              <div style="${alertBoxStyle}">
                <p style="margin: 0; color: #92400e;"><strong>📝 ملاحظة من الإدارة:</strong></p>
                <p style="margin: 10px 0 0; color: #92400e;">${data.admin_note}</p>
              </div>
              ` : ''}
              
              <a href="https://help.webyan.net/staff/meetings" style="${buttonStyle}">
                فتح لوحة الاجتماعات
              </a>
            </div>
            <div style="${footerStyle}">
              <p style="margin: 0;">فريق إدارة ويبيان</p>
            </div>
          </div>
        `
      };

    case 'new_reply':
      return {
        subject: `💬 رد جديد على التذكرة: ${data.ticket_number}`,
        html: `
          <div style="${baseStyle}">
            <div style="${headerStyle}">
              <h1 style="margin: 0; font-size: 24px;">💬 رد جديد على التذكرة</h1>
            </div>
            <div style="${contentStyle}">
              <p style="font-size: 18px; color: #1f2937;">مرحباً ${staffName}،</p>
              <p style="color: #4b5563; line-height: 1.8;">تم إضافة رد جديد على التذكرة الموجهة إليك:</p>
              
              <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #3b82f6;">
                <p style="margin: 0; color: #1e40af;"><strong>📌 رقم التذكرة:</strong> ${data.ticket_number}</p>
                <p style="margin: 10px 0 0; color: #1e40af;"><strong>📋 الموضوع:</strong> ${data.ticket_subject}</p>
                <p style="margin: 10px 0 0; color: #1e40af;"><strong>👤 من:</strong> ${data.reply_from}</p>
              </div>
              
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 0; color: #374151;">${data.reply_message}</p>
              </div>
              
              <a href="https://help.webyan.net/staff/tickets" style="${buttonStyle}">
                فتح لوحة التذاكر
              </a>
            </div>
            <div style="${footerStyle}">
              <p style="margin: 0;">فريق إدارة ويبيان</p>
            </div>
          </div>
        `
      };

    default:
      return {
        subject: 'إشعار من ويبيان',
        html: `<p>مرحباً ${staffName}، لديك إشعار جديد.</p>`
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, staff_email, staff_name, data }: StaffNotificationRequest = await req.json();

    console.log('Sending staff notification:', { type, staff_email, staff_name });

    const emailContent = getEmailContent(type, data, staff_name);

    const emailResponse = await resend.emails.send({
      from: "ويبيان <support@webyan.net>",
      to: [staff_email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Staff notification sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending staff notification:", error);
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
