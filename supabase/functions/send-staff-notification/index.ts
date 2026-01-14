import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffNotificationRequest {
  type: 'ticket_assigned' | 'meeting_assigned' | 'new_reply' | 'escalation_alert';
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
    escalation_reason?: string;
  };
}

const getEmailTemplate = (type: string, data: any, staffName: string) => {
  const logo = `
    <div style="text-align: center; margin-bottom: 20px;">
      <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="40" rx="8" fill="#1e40af"/>
        <text x="60" y="26" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">ويبيان</text>
      </svg>
    </div>
  `;

  const baseStyle = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    direction: rtl;
    text-align: right;
    max-width: 600px;
    margin: 0 auto;
    background: #f9fafb;
    padding: 20px;
  `;

  const containerStyle = `
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  `;

  const headerStyle = (gradient: string) => `
    background: linear-gradient(135deg, ${gradient});
    color: white;
    padding: 40px 30px;
    text-align: center;
  `;

  const contentStyle = `
    padding: 30px;
  `;

  const footerStyle = `
    background: linear-gradient(to right, #1e3a8a, #1e40af);
    padding: 25px;
    text-align: center;
    color: white;
  `;

  const buttonStyle = (color: string) => `
    display: inline-block;
    background: linear-gradient(135deg, ${color});
    color: white;
    padding: 14px 35px;
    border-radius: 10px;
    text-decoration: none;
    font-weight: bold;
    font-size: 16px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  `;

  const infoBoxStyle = (borderColor: string, bgColor: string) => `
    background: ${bgColor};
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
    border-right: 5px solid ${borderColor};
  `;

  const alertBoxStyle = `
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border: 2px solid #f59e0b;
    border-radius: 12px;
    padding: 15px 20px;
    margin: 20px 0;
  `;

  const iconBadge = (emoji: string, bgColor: string) => `
    <div style="width: 80px; height: 80px; background: ${bgColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 36px;">
      ${emoji}
    </div>
  `;

  switch (type) {
    case 'ticket_assigned':
      return {
        subject: `🎫 تذكرة جديدة موجهة إليك: ${data.ticket_number}`,
        html: `
          <div style="${baseStyle}">
            <div style="${containerStyle}">
              <div style="${headerStyle('#3b82f6, #1d4ed8')}">
                ${iconBadge('🎫', 'rgba(255,255,255,0.2)')}
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">تذكرة جديدة موجهة إليك</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">مطلوب إجراء من طرفك</p>
              </div>
              
              <div style="${contentStyle}">
                <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">مرحباً <strong>${staffName}</strong>،</p>
                <p style="color: #4b5563; line-height: 1.8; font-size: 16px;">تم توجيه تذكرة دعم جديدة إليك. يرجى مراجعتها والتعامل معها في أقرب وقت:</p>
                
                <div style="${infoBoxStyle('#3b82f6', '#eff6ff')}">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #1e40af; font-weight: bold;">📌 رقم التذكرة:</td>
                      <td style="padding: 8px 0; color: #1e40af; font-size: 18px; font-weight: bold;">${data.ticket_number}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #1e40af; font-weight: bold;">📋 الموضوع:</td>
                      <td style="padding: 8px 0; color: #1e40af;">${data.ticket_subject}</td>
                    </tr>
                    ${data.organization_name ? `
                    <tr>
                      <td style="padding: 8px 0; color: #1e40af; font-weight: bold;">🏢 المؤسسة:</td>
                      <td style="padding: 8px 0; color: #1e40af;">${data.organization_name}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                
                ${data.admin_note ? `
                <div style="${alertBoxStyle}">
                  <p style="margin: 0 0 8px; color: #92400e; font-weight: bold; font-size: 14px;">📝 ملاحظة من الإدارة:</p>
                  <p style="margin: 0; color: #78350f; font-size: 15px; line-height: 1.6;">${data.admin_note}</p>
                </div>
                ` : ''}
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://help.webyan.net/staff/tickets" style="${buttonStyle('#3b82f6, #1d4ed8')}">
                    📋 فتح لوحة التذاكر
                  </a>
                </div>
              </div>
              
              <div style="${footerStyle}">
                ${logo}
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">نظام إدارة الدعم الفني - ويبيان</p>
                <p style="margin: 5px 0 0; font-size: 12px; opacity: 0.7;">support@webyan.net</p>
              </div>
            </div>
          </div>
        `
      };

    case 'meeting_assigned':
      return {
        subject: `📅 اجتماع جديد موجه إليك: ${data.meeting_subject}`,
        html: `
          <div style="${baseStyle}">
            <div style="${containerStyle}">
              <div style="${headerStyle('#10b981, #059669')}">
                ${iconBadge('📅', 'rgba(255,255,255,0.2)')}
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">اجتماع جديد موجه إليك</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">يرجى التحضير والحضور في الموعد</p>
              </div>
              
              <div style="${contentStyle}">
                <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">مرحباً <strong>${staffName}</strong>،</p>
                <p style="color: #4b5563; line-height: 1.8; font-size: 16px;">تم توجيه اجتماع جديد إليك. يرجى مراجعة التفاصيل والتحضير:</p>
                
                <div style="${infoBoxStyle('#10b981', '#ecfdf5')}">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 0; color: #065f46; font-weight: bold;">📋 الموضوع:</td>
                      <td style="padding: 10px 0; color: #065f46; font-size: 17px; font-weight: bold;">${data.meeting_subject}</td>
                    </tr>
                    ${data.meeting_date ? `
                    <tr>
                      <td style="padding: 10px 0; color: #065f46; font-weight: bold;">📅 الموعد:</td>
                      <td style="padding: 10px 0; color: #065f46;">${data.meeting_date}</td>
                    </tr>
                    ` : ''}
                    ${data.organization_name ? `
                    <tr>
                      <td style="padding: 10px 0; color: #065f46; font-weight: bold;">🏢 المؤسسة:</td>
                      <td style="padding: 10px 0; color: #065f46;">${data.organization_name}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                
                ${data.admin_note ? `
                <div style="${alertBoxStyle}">
                  <p style="margin: 0 0 8px; color: #92400e; font-weight: bold; font-size: 14px;">📝 ملاحظة من الإدارة:</p>
                  <p style="margin: 0; color: #78350f; font-size: 15px; line-height: 1.6;">${data.admin_note}</p>
                </div>
                ` : ''}
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://help.webyan.net/staff/meetings" style="${buttonStyle('#10b981, #059669')}">
                    📅 فتح لوحة الاجتماعات
                  </a>
                </div>
              </div>
              
              <div style="${footerStyle}">
                ${logo}
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">نظام إدارة الدعم الفني - ويبيان</p>
                <p style="margin: 5px 0 0; font-size: 12px; opacity: 0.7;">support@webyan.net</p>
              </div>
            </div>
          </div>
        `
      };

    case 'new_reply':
      return {
        subject: `💬 رد جديد على التذكرة: ${data.ticket_number}`,
        html: `
          <div style="${baseStyle}">
            <div style="${containerStyle}">
              <div style="${headerStyle('#8b5cf6, #7c3aed')}">
                ${iconBadge('💬', 'rgba(255,255,255,0.2)')}
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">رد جديد على التذكرة</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">تحتاج إلى متابعة</p>
              </div>
              
              <div style="${contentStyle}">
                <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">مرحباً <strong>${staffName}</strong>،</p>
                <p style="color: #4b5563; line-height: 1.8; font-size: 16px;">تم إضافة رد جديد على التذكرة الموجهة إليك:</p>
                
                <div style="${infoBoxStyle('#8b5cf6', '#f5f3ff')}">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #5b21b6; font-weight: bold;">📌 رقم التذكرة:</td>
                      <td style="padding: 8px 0; color: #5b21b6;">${data.ticket_number}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #5b21b6; font-weight: bold;">📋 الموضوع:</td>
                      <td style="padding: 8px 0; color: #5b21b6;">${data.ticket_subject}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #5b21b6; font-weight: bold;">👤 من:</td>
                      <td style="padding: 8px 0; color: #5b21b6;">${data.reply_from}</td>
                    </tr>
                  </table>
                </div>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0; border-right: 5px solid #6b7280;">
                  <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.8;">${data.reply_message}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://help.webyan.net/staff/tickets" style="${buttonStyle('#8b5cf6, #7c3aed')}">
                    💬 فتح التذكرة والرد
                  </a>
                </div>
              </div>
              
              <div style="${footerStyle}">
                ${logo}
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">نظام إدارة الدعم الفني - ويبيان</p>
              </div>
            </div>
          </div>
        `
      };

    case 'escalation_alert':
      return {
        subject: `🚨 تذكرة مصعدة تحتاج اهتمام: ${data.ticket_number}`,
        html: `
          <div style="${baseStyle}">
            <div style="${containerStyle}">
              <div style="${headerStyle('#ef4444, #dc2626')}">
                ${iconBadge('🚨', 'rgba(255,255,255,0.2)')}
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">تذكرة مصعدة</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">تحتاج اهتمام عاجل</p>
              </div>
              
              <div style="${contentStyle}">
                <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">مرحباً <strong>${staffName}</strong>،</p>
                <p style="color: #4b5563; line-height: 1.8; font-size: 16px;">تم تصعيد التذكرة التالية لعدم الرد عليها في الوقت المحدد:</p>
                
                <div style="${infoBoxStyle('#ef4444', '#fef2f2')}">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #991b1b; font-weight: bold;">📌 رقم التذكرة:</td>
                      <td style="padding: 8px 0; color: #991b1b; font-size: 18px; font-weight: bold;">${data.ticket_number}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #991b1b; font-weight: bold;">📋 الموضوع:</td>
                      <td style="padding: 8px 0; color: #991b1b;">${data.ticket_subject}</td>
                    </tr>
                    ${data.escalation_reason ? `
                    <tr>
                      <td style="padding: 8px 0; color: #991b1b; font-weight: bold;">⚠️ السبب:</td>
                      <td style="padding: 8px 0; color: #991b1b;">${data.escalation_reason}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://help.webyan.net/staff/tickets" style="${buttonStyle('#ef4444, #dc2626')}">
                    🚨 معالجة التذكرة الآن
                  </a>
                </div>
              </div>
              
              <div style="${footerStyle}">
                ${logo}
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">نظام إدارة الدعم الفني - ويبيان</p>
              </div>
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

    const emailContent = getEmailTemplate(type, data, staff_name);

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
