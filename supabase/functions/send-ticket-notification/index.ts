import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketNotificationRequest {
  email: string;
  ticketNumber: string;
  subject: string;
  type: 'created' | 'reply' | 'resolved' | 'status_update' | 'new_ticket_admin';
  message?: string;
  newStatus?: string;
  siteUrl?: string;
  adminEmail?: string;
  customerName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, ticketNumber, subject, type, message, newStatus, siteUrl, adminEmail, customerName }: TicketNotificationRequest = await req.json();

    if (!email) {
      console.log("No email provided, skipping notification");
      return new Response(JSON.stringify({ message: "No email provided" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending ${type} notification for ticket ${ticketNumber} to ${email}`);

    // Initialize Supabase client to get settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get system settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value');

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const companyName = settingsMap['company_name'] || 'ويبيان';
    const responseTime = settingsMap['support_response_time'] || '48';
    const systemAdminEmail = adminEmail || settingsMap['admin_email'] || 'support@webyan.net';
    const baseUrl = siteUrl || 'https://docs.webyan.net';

    let emailSubject = '';
    let emailHtml = '';

    // Common email styles
    const emailStyles = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
        * { font-family: 'Tajawal', Arial, sans-serif; }
        body { margin: 0; padding: 0; background-color: #f4f7fa; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; }
        .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px; }
        .content { padding: 40px 30px; }
        .ticket-box { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-right: 4px solid #2563eb; }
        .ticket-number { font-size: 24px; font-weight: 700; color: #1e40af; font-family: monospace; }
        .ticket-subject { color: #374151; margin-top: 8px; font-size: 16px; }
        .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { color: #6b7280; font-size: 14px; }
        .info-value { color: #111827; font-weight: 500; font-size: 14px; }
        .button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
        .button:hover { background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%); }
        .footer { background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { color: #6b7280; font-size: 12px; margin: 4px 0; }
        .highlight-box { background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-right: 4px solid #f59e0b; }
        .success-box { background-color: #d1fae5; border-radius: 8px; padding: 16px; margin: 20px 0; border-right: 4px solid #10b981; }
        .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; }
        .status-open { background-color: #dbeafe; color: #1e40af; }
        .status-in_progress { background-color: #fef3c7; color: #92400e; }
        .status-resolved { background-color: #d1fae5; color: #065f46; }
        .status-closed { background-color: #f3f4f6; color: #374151; }
        .message-box { background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; }
        .icon-circle { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 36px; }
        .icon-success { background-color: #d1fae5; }
        .icon-new { background-color: #dbeafe; }
        .icon-update { background-color: #fef3c7; }
      </style>
    `;

    const getStatusArabic = (status: string) => {
      const statusMap: Record<string, string> = {
        'open': 'مفتوحة',
        'in_progress': 'قيد المعالجة',
        'resolved': 'تم الحل',
        'closed': 'مغلقة'
      };
      return statusMap[status] || status;
    };

    switch (type) {
      case 'created':
        emailSubject = `✅ تم استلام تذكرتك #${ticketNumber} | ${companyName}`;
        emailHtml = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${emailStyles}
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>شكراً لتواصلك معنا! 🎉</h1>
                <p>تم استلام تذكرة الدعم الفني بنجاح</p>
              </div>
              
              <div class="content">
                <div style="text-align: center;">
                  <div class="icon-circle icon-success">✅</div>
                  <h2 style="color: #111827; margin-bottom: 8px;">تم تسجيل طلبك بنجاح</h2>
                  <p style="color: #6b7280;">سيقوم فريق الدعم الفني بمراجعة طلبك والرد عليك</p>
                </div>
                
                <div class="ticket-box">
                  <div style="text-align: center;">
                    <span style="color: #6b7280; font-size: 14px;">رقم التذكرة</span>
                    <div class="ticket-number">${ticketNumber}</div>
                  </div>
                  <div class="ticket-subject" style="text-align: center; margin-top: 12px;">
                    <strong>الموضوع:</strong> ${subject}
                  </div>
                </div>
                
                <div class="highlight-box">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 24px;">⏰</span>
                    <div>
                      <strong style="color: #92400e;">الوقت المتوقع للرد</strong>
                      <p style="margin: 4px 0 0; color: #78350f;">سيتم الرد على تذكرتك خلال <strong>${responseTime} ساعة عمل</strong> بحد أقصى</p>
                    </div>
                  </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${baseUrl}/track-ticket" class="button">متابعة حالة التذكرة</a>
                </div>
                
                <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-top: 24px;">
                  <h3 style="margin: 0 0 16px; color: #374151; font-size: 16px;">💡 نصائح مفيدة:</h3>
                  <ul style="margin: 0; padding-right: 20px; color: #6b7280; line-height: 2;">
                    <li>احتفظ برقم التذكرة لمتابعة حالة طلبك</li>
                    <li>ستصلك رسالة عند أي تحديث على التذكرة</li>
                    <li>يمكنك الرد على هذه الرسالة لإضافة معلومات إضافية</li>
                  </ul>
                </div>
              </div>
              
              <div class="footer">
                <p><strong>${companyName}</strong></p>
                <p>فريق الدعم الفني</p>
                <p style="margin-top: 16px; color: #9ca3af;">© ${new Date().getFullYear()} جميع الحقوق محفوظة</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'reply':
        emailSubject = `💬 رد جديد على تذكرتك #${ticketNumber} | ${companyName}`;
        emailHtml = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${emailStyles}
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>رد جديد على تذكرتك 💬</h1>
                <p>فريق الدعم الفني قام بالرد على استفسارك</p>
              </div>
              
              <div class="content">
                <div class="ticket-box">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <span style="color: #6b7280; font-size: 14px;">رقم التذكرة</span>
                      <div class="ticket-number">${ticketNumber}</div>
                    </div>
                    <span class="status-badge status-in_progress">قيد المعالجة</span>
                  </div>
                </div>
                
                <div class="message-box">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #2563eb; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">👨‍💼</div>
                    <div>
                      <strong style="color: #111827;">فريق الدعم الفني</strong>
                      <p style="margin: 0; color: #6b7280; font-size: 12px;">${new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <p style="color: #374151; line-height: 1.8; white-space: pre-wrap;">${message || 'تم الرد على تذكرتك'}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${baseUrl}/track-ticket" class="button">عرض المحادثة كاملة</a>
                </div>
              </div>
              
              <div class="footer">
                <p><strong>${companyName}</strong></p>
                <p>فريق الدعم الفني</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'resolved':
        emailSubject = `✅ تم حل تذكرتك #${ticketNumber} | ${companyName}`;
        emailHtml = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${emailStyles}
          </head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #059669 0%, #047857 100%);">
                <h1>تم حل تذكرتك بنجاح! ✅</h1>
                <p>نأمل أن نكون قد ساعدناك</p>
              </div>
              
              <div class="content">
                <div style="text-align: center;">
                  <div class="icon-circle icon-success">🎉</div>
                  <h2 style="color: #111827; margin-bottom: 8px;">تم إغلاق التذكرة</h2>
                  <p style="color: #6b7280;">نسعد بخدمتك دائماً</p>
                </div>
                
                <div class="ticket-box" style="border-right-color: #059669; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);">
                  <div class="info-row">
                    <span class="info-label">رقم التذكرة:</span>
                    <span class="ticket-number" style="font-size: 18px;">${ticketNumber}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">الموضوع:</span>
                    <span class="info-value">${subject}</span>
                  </div>
                  <div class="info-row" style="border-bottom: none;">
                    <span class="info-label">الحالة:</span>
                    <span class="status-badge status-resolved">تم الحل ✓</span>
                  </div>
                </div>
                
                <div class="success-box">
                  <p style="margin: 0; color: #065f46;">
                    <strong>شكراً لتواصلك معنا!</strong><br>
                    إذا كان لديك أي استفسار آخر، لا تتردد في فتح تذكرة جديدة.
                  </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${baseUrl}/submit-ticket" class="button" style="background: linear-gradient(135deg, #059669 0%, #047857 100%);">فتح تذكرة جديدة</a>
                </div>
              </div>
              
              <div class="footer">
                <p><strong>${companyName}</strong></p>
                <p>فريق الدعم الفني</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'status_update':
        const statusClass = `status-${newStatus}`;
        emailSubject = `🔄 تحديث على تذكرتك #${ticketNumber} | ${companyName}`;
        emailHtml = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${emailStyles}
          </head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <h1>تحديث على تذكرتك 🔄</h1>
                <p>تم تحديث حالة تذكرة الدعم الفني</p>
              </div>
              
              <div class="content">
                <div style="text-align: center;">
                  <div class="icon-circle icon-update">📋</div>
                  <h2 style="color: #111827; margin-bottom: 8px;">تم تحديث حالة التذكرة</h2>
                </div>
                
                <div class="ticket-box" style="border-right-color: #f59e0b; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);">
                  <div class="info-row">
                    <span class="info-label">رقم التذكرة:</span>
                    <span class="ticket-number" style="font-size: 18px;">${ticketNumber}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">الموضوع:</span>
                    <span class="info-value">${subject}</span>
                  </div>
                  <div class="info-row" style="border-bottom: none;">
                    <span class="info-label">الحالة الجديدة:</span>
                    <span class="status-badge ${statusClass}">${getStatusArabic(newStatus || '')}</span>
                  </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${baseUrl}/track-ticket" class="button" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">متابعة التذكرة</a>
                </div>
              </div>
              
              <div class="footer">
                <p><strong>${companyName}</strong></p>
                <p>فريق الدعم الفني</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      default:
        emailSubject = `تحديث على تذكرتك #${ticketNumber}`;
        emailHtml = `<p>تم تحديث تذكرتك رقم ${ticketNumber}</p>`;
    }

    // Send email to customer
    const emailResponse = await resend.emails.send({
      from: `${companyName} <support@webyan.net>`,
      to: [email],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // If this is a new ticket, also notify admin
    if (type === 'created' && systemAdminEmail) {
      const adminEmailSubject = `🎫 تذكرة دعم جديدة #${ticketNumber} | ${companyName}`;
      const adminEmailHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${emailStyles}
        </head>
        <body>
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">
              <h1>تذكرة دعم جديدة 🎫</h1>
              <p>وصلت تذكرة جديدة تحتاج إلى مراجعة</p>
            </div>
            
            <div class="content">
              <div style="text-align: center;">
                <div class="icon-circle" style="background-color: #fee2e2;">🔔</div>
                <h2 style="color: #111827; margin-bottom: 8px;">تذكرة دعم جديدة</h2>
                <p style="color: #6b7280;">تم استلام طلب دعم فني جديد من عميل</p>
              </div>
              
              <div class="ticket-box" style="border-right-color: #dc2626; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);">
                <div class="info-row">
                  <span class="info-label">رقم التذكرة:</span>
                  <span class="ticket-number" style="font-size: 18px;">${ticketNumber}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">العميل:</span>
                  <span class="info-value">${customerName || email}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">البريد:</span>
                  <span class="info-value">${email}</span>
                </div>
                <div class="info-row" style="border-bottom: none;">
                  <span class="info-label">الموضوع:</span>
                  <span class="info-value">${subject}</span>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/admin/tickets" class="button" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">عرض التذكرة في لوحة التحكم</a>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>${companyName}</strong></p>
              <p>نظام إدارة التذاكر</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await resend.emails.send({
          from: `${companyName} <support@webyan.net>`,
          to: [systemAdminEmail],
          subject: adminEmailSubject,
          html: adminEmailHtml,
        });
        console.log("Admin notification sent successfully to:", systemAdminEmail);
      } catch (adminError) {
        console.error("Error sending admin notification:", adminError);
      }
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-ticket-notification function:", error);
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
