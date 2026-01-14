import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'ticket_reply' | 'ticket_status' | 'meeting_confirmed' | 'meeting_cancelled' | 'meeting_completed' | 'subscription_approved' | 'subscription_rejected';
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
    outcome?: string;
  };
}

const getEmailTemplate = (type: string, data: any, clientName: string) => {
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

  const iconBadge = (emoji: string, bgColor: string) => `
    <div style="width: 80px; height: 80px; background: ${bgColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 36px;">
      ${emoji}
    </div>
  `;

  switch (type) {
    case 'ticket_reply':
      return {
        subject: `💬 رد جديد على تذكرتك ${data.ticket_number}`,
        html: `
          <div style="${baseStyle}">
            <div style="${containerStyle}">
              <div style="${headerStyle('#667eea, #764ba2')}">
                ${iconBadge('💬', 'rgba(255,255,255,0.2)')}
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">رد جديد على تذكرتك</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">فريق الدعم يتابع طلبك</p>
              </div>
              
              <div style="${contentStyle}">
                <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">مرحباً <strong>${clientName}</strong>،</p>
                <p style="color: #4b5563; line-height: 1.8; font-size: 16px;">تم إضافة رد جديد على تذكرتك:</p>
                
                <div style="${infoBoxStyle('#667eea', '#f5f3ff')}">
                  <p style="margin: 0; color: #5b21b6;"><strong>📌 رقم التذكرة:</strong> ${data.ticket_number}</p>
                  <p style="margin: 10px 0 0; color: #5b21b6;"><strong>📋 الموضوع:</strong> ${data.ticket_subject}</p>
                </div>
                
                <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0; border-right: 5px solid #f59e0b;">
                  <p style="margin: 0; color: #78350f; font-size: 15px; line-height: 1.8;">${data.reply_message}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://help.webyan.net/portal/tickets" style="${buttonStyle('#667eea, #764ba2')}">
                    📋 عرض التذكرة
                  </a>
                </div>
              </div>
              
              <div style="${footerStyle}">
                ${logo}
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">فريق دعم ويبيان</p>
                <p style="margin: 5px 0 0; font-size: 12px; opacity: 0.7;">support@webyan.net</p>
              </div>
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
      const statusColors: Record<string, { bg: string; text: string; gradient: string }> = {
        open: { bg: '#dbeafe', text: '#1e40af', gradient: '#3b82f6, #1d4ed8' },
        in_progress: { bg: '#fef3c7', text: '#92400e', gradient: '#f59e0b, #d97706' },
        resolved: { bg: '#d1fae5', text: '#065f46', gradient: '#10b981, #059669' },
        closed: { bg: '#f3f4f6', text: '#374151', gradient: '#6b7280, #4b5563' }
      };
      const statusColor = statusColors[data.new_status] || statusColors.open;
      
      return {
        subject: `🔄 تحديث حالة التذكرة ${data.ticket_number}`,
        html: `
          <div style="${baseStyle}">
            <div style="${containerStyle}">
              <div style="${headerStyle(statusColor.gradient)}">
                ${iconBadge('🔄', 'rgba(255,255,255,0.2)')}
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">تحديث حالة التذكرة</h1>
              </div>
              
              <div style="${contentStyle}">
                <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">مرحباً <strong>${clientName}</strong>،</p>
                <p style="color: #4b5563; line-height: 1.8; font-size: 16px;">تم تحديث حالة تذكرتك:</p>
                
                <div style="background: #f3f4f6; padding: 30px; border-radius: 16px; margin: 25px 0; text-align: center;">
                  <p style="margin: 0 0 15px; color: #374151; font-size: 14px;"><strong>📌 رقم التذكرة:</strong> ${data.ticket_number}</p>
                  <div style="display: inline-block; background: ${statusColor.bg}; color: ${statusColor.text}; padding: 12px 30px; border-radius: 25px; font-weight: bold; font-size: 18px;">
                    ${statusLabels[data.new_status] || data.new_status}
                  </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://help.webyan.net/portal/tickets" style="${buttonStyle(statusColor.gradient)}">
                    📋 عرض التذكرة
                  </a>
                </div>
              </div>
              
              <div style="${footerStyle}">
                ${logo}
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">فريق دعم ويبيان</p>
              </div>
            </div>
          </div>
        `
      };

    case 'meeting_confirmed':
      return {
        subject: `✅ تأكيد موعد الاجتماع: ${data.meeting_subject}`,
        html: `
          <div style="${baseStyle}">
            <div style="${containerStyle}">
              <div style="${headerStyle('#10b981, #059669')}">
                ${iconBadge('✅', 'rgba(255,255,255,0.2)')}
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">تم تأكيد موعد اجتماعك</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">نتطلع للقائك!</p>
              </div>
              
              <div style="${contentStyle}">
                <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">مرحباً <strong>${clientName}</strong>،</p>
                <p style="color: #4b5563; line-height: 1.8; font-size: 16px;">تم تأكيد موعد اجتماعك مع فريق ويبيان:</p>
                
                <div style="${infoBoxStyle('#10b981', '#ecfdf5')}">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 0; color: #065f46; font-weight: bold;">📋 الموضوع:</td>
                      <td style="padding: 10px 0; color: #065f46; font-size: 17px;">${data.meeting_subject}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #065f46; font-weight: bold;">📅 الموعد:</td>
                      <td style="padding: 10px 0; color: #065f46;">${data.meeting_date}</td>
                    </tr>
                    ${data.meeting_link ? `
                    <tr>
                      <td style="padding: 10px 0; color: #065f46; font-weight: bold;">🔗 الرابط:</td>
                      <td style="padding: 10px 0;"><a href="${data.meeting_link}" style="color: #059669; text-decoration: underline;">${data.meeting_link}</a></td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://help.webyan.net/portal/meetings" style="${buttonStyle('#10b981, #059669')}">
                    📅 عرض الاجتماعات
                  </a>
                </div>
              </div>
              
              <div style="${footerStyle}">
                ${logo}
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">فريق ويبيان</p>
              </div>
            </div>
          </div>
        `
      };

    case 'meeting_cancelled':
      return {
        subject: `❌ إلغاء الاجتماع: ${data.meeting_subject}`,
        html: `
          <div style="${baseStyle}">
            <div style="${containerStyle}">
              <div style="${headerStyle('#ef4444, #dc2626')}">
                ${iconBadge('❌', 'rgba(255,255,255,0.2)')}
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">تم إلغاء الاجتماع</h1>
              </div>
              
              <div style="${contentStyle}">
                <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">مرحباً <strong>${clientName}</strong>،</p>
                <p style="color: #4b5563; line-height: 1.8; font-size: 16px;">نأسف لإبلاغك بأنه تم إلغاء الاجتماع التالي:</p>
                
                <div style="${infoBoxStyle('#ef4444', '#fef2f2')}">
                  <p style="margin: 0; color: #991b1b;"><strong>📋 الموضوع:</strong> ${data.meeting_subject}</p>
                  ${data.admin_response ? `<p style="margin: 10px 0 0; color: #991b1b;"><strong>📝 السبب:</strong> ${data.admin_response}</p>` : ''}
                </div>
                
                <p style="color: #4b5563; font-size: 15px;">يمكنك طلب موعد جديد من خلال بوابة العملاء.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://help.webyan.net/portal/meetings/new" style="${buttonStyle('#3b82f6, #1d4ed8')}">
                    📅 طلب موعد جديد
                  </a>
                </div>
              </div>
              
              <div style="${footerStyle}">
                ${logo}
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">فريق ويبيان</p>
              </div>
            </div>
          </div>
        `
      };

    case 'meeting_completed':
      return {
        subject: `📝 تم إكمال الاجتماع: ${data.meeting_subject}`,
        html: `
          <div style="${baseStyle}">
            <div style="${containerStyle}">
              <div style="${headerStyle('#3b82f6, #1d4ed8')}">
                ${iconBadge('📝', 'rgba(255,255,255,0.2)')}
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">تم إكمال الاجتماع</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">نقدر تعاونك معنا!</p>
              </div>
              
              <div style="${contentStyle}">
                <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">مرحباً <strong>${clientName}</strong>،</p>
                <p style="color: #4b5563; line-height: 1.8; font-size: 16px;">تم إكمال اجتماعك وتسجيل التقرير:</p>
                
                <div style="${infoBoxStyle('#3b82f6', '#eff6ff')}">
                  <p style="margin: 0; color: #1e40af;"><strong>📋 الموضوع:</strong> ${data.meeting_subject}</p>
                  ${data.outcome ? `<p style="margin: 10px 0 0; color: #1e40af;"><strong>📊 النتيجة:</strong> ${data.outcome}</p>` : ''}
                </div>
                
                <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0 0 10px; color: #92400e; font-size: 16px; font-weight: bold;">⭐ شاركنا رأيك!</p>
                  <p style="margin: 0; color: #78350f; font-size: 14px;">نقدر ملاحظاتك لتحسين خدماتنا</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://help.webyan.net/portal/meetings" style="${buttonStyle('#f59e0b, #d97706')}">
                    ⭐ تقييم الاجتماع
                  </a>
                </div>
              </div>
              
              <div style="${footerStyle}">
                ${logo}
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">فريق ويبيان</p>
              </div>
            </div>
          </div>
        `
      };

    case 'subscription_approved':
      return {
        subject: `🎉 تم الموافقة على طلب الاشتراك`,
        html: `
          <div style="${baseStyle}">
            <div style="${containerStyle}">
              <div style="${headerStyle('#10b981, #059669')}">
                ${iconBadge('🎉', 'rgba(255,255,255,0.2)')}
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">تم الموافقة على اشتراكك!</h1>
              </div>
              
              <div style="${contentStyle}">
                <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">مرحباً <strong>${clientName}</strong>،</p>
                <p style="color: #4b5563; line-height: 1.8; font-size: 16px;">يسعدنا إبلاغك بأنه تم الموافقة على طلب اشتراكك!</p>
                
                <div style="background: #ecfdf5; padding: 30px; border-radius: 16px; margin: 25px 0; text-align: center;">
                  <p style="margin: 0; color: #065f46; font-size: 14px;">الباقة المفعلة</p>
                  <p style="margin: 10px 0 0; color: #065f46; font-size: 24px; font-weight: bold;">${data.subscription_plan}</p>
                </div>
                
                ${data.admin_response ? `
                <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
                  <p style="margin: 0; color: #374151; font-size: 15px;">${data.admin_response}</p>
                </div>
                ` : ''}
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://help.webyan.net/portal/subscription" style="${buttonStyle('#10b981, #059669')}">
                    📋 عرض تفاصيل الاشتراك
                  </a>
                </div>
              </div>
              
              <div style="${footerStyle}">
                ${logo}
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">شكراً لثقتك بنا!</p>
              </div>
            </div>
          </div>
        `
      };

    case 'subscription_rejected':
      return {
        subject: `📋 تحديث على طلب الاشتراك`,
        html: `
          <div style="${baseStyle}">
            <div style="${containerStyle}">
              <div style="${headerStyle('#f59e0b, #d97706')}">
                ${iconBadge('📋', 'rgba(255,255,255,0.2)')}
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">تحديث على طلب اشتراكك</h1>
              </div>
              
              <div style="${contentStyle}">
                <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">مرحباً <strong>${clientName}</strong>،</p>
                <p style="color: #4b5563; line-height: 1.8; font-size: 16px;">نأسف لإبلاغك بأنه لم نتمكن من الموافقة على طلب اشتراكك في الوقت الحالي.</p>
                
                ${data.admin_response ? `
                <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0; border-right: 5px solid #f59e0b;">
                  <p style="margin: 0 0 5px; color: #92400e; font-weight: bold;">📝 ملاحظة:</p>
                  <p style="margin: 0; color: #78350f; font-size: 15px;">${data.admin_response}</p>
                </div>
                ` : ''}
                
                <p style="color: #4b5563; font-size: 15px;">يمكنك التواصل معنا لمزيد من التفاصيل.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://help.webyan.net/portal/messages" style="${buttonStyle('#3b82f6, #1d4ed8')}">
                    💬 تواصل معنا
                  </a>
                </div>
              </div>
              
              <div style="${footerStyle}">
                ${logo}
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">فريق ويبيان</p>
              </div>
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

    const emailContent = getEmailTemplate(type, data, client_name);

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
