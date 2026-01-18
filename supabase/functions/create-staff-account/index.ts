import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type StaffRole = 'admin' | 'editor' | 'support_agent';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('غير مصرح: لم يتم توفير رمز التوثيق');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      throw new Error('غير مصرح: رمز التوثيق غير صالح');
    }

    // Check if caller is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      throw new Error('غير مصرح: فقط المدراء يمكنهم إنشاء حسابات الموظفين');
    }

    const requestBody = await req.json();
    const { 
      full_name, 
      email, 
      password, 
      phone, 
      job_title, 
      is_active,
      role, // The new role field
      can_reply_tickets,
      can_manage_content,
      can_attend_meetings
    } = requestBody;

    // Validate required fields
    if (!full_name?.trim()) {
      throw new Error('الاسم الكامل مطلوب');
    }

    if (!email?.trim()) {
      throw new Error('البريد الإلكتروني مطلوب');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('البريد الإلكتروني غير صالح');
    }

    if (!password) {
      throw new Error('كلمة المرور مطلوبة');
    }

    if (password.length < 6) {
      throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    // Validate role
    const validRoles: StaffRole[] = ['admin', 'editor', 'support_agent'];
    const staffRole: StaffRole = validRoles.includes(role) ? role : 'support_agent';

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = full_name.trim();

    // Check if email already exists in staff_members
    const { data: existingStaff } = await supabaseAdmin
      .from('staff_members')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingStaff) {
      throw new Error('هذا البريد الإلكتروني مسجل بالفعل كموظف');
    }

    // Check if user exists in auth
    const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.find(u => u.email?.toLowerCase() === cleanEmail);
    
    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // Use existing user
      userId = existingUser.id;
      
      // Update user role
      await supabaseAdmin
        .from('user_roles')
        .upsert({ 
          user_id: existingUser.id, 
          role: staffRole 
        }, { 
          onConflict: 'user_id' 
        });
    } else {
      // Create new user in auth
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          is_staff: true,
          role: staffRole
        }
      });

      if (createError) {
        console.error('Auth creation error:', createError);
        throw new Error(`فشل إنشاء الحساب: ${createError.message}`);
      }

      if (!authData.user) {
        throw new Error('فشل إنشاء حساب المستخدم');
      }

      userId = authData.user.id;
      isNewUser = true;

      // Assign role to new user
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ 
          user_id: userId, 
          role: staffRole 
        });

      if (roleError) {
        console.error('Role assignment error:', roleError);
        // Don't fail the whole operation, just log it
      }
    }

    // Create staff member record
    const { error: staffError, data: staffData } = await supabaseAdmin
      .from('staff_members')
      .insert({
        user_id: userId,
        full_name: cleanName,
        email: cleanEmail,
        phone: phone?.trim() || null,
        job_title: job_title?.trim() || null,
        is_active: is_active ?? true,
        can_reply_tickets: can_reply_tickets ?? (staffRole === 'support_agent' || staffRole === 'admin'),
        can_manage_content: can_manage_content ?? (staffRole === 'editor' || staffRole === 'admin'),
        can_attend_meetings: can_attend_meetings ?? (staffRole === 'support_agent' || staffRole === 'admin')
      })
      .select()
      .single();

    if (staffError) {
      console.error('Staff member creation error:', staffError);
      // If user was just created, rollback
      if (isNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      throw new Error(`فشل إنشاء سجل الموظف: ${staffError.message}`);
    }

    // Get role display name
    const roleNames: Record<StaffRole, string> = {
      admin: 'مدير',
      editor: 'محرر',
      support_agent: 'دعم فني'
    };

    const rolePortals: Record<StaffRole, { name: string; path: string }> = {
      admin: { name: 'لوحة التحكم', path: '/admin' },
      editor: { name: 'لوحة التحكم', path: '/admin' },
      support_agent: { name: 'بوابة الدعم الفني', path: '/support' }
    };

    // Send welcome email with login credentials
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && isNewUser) {
      try {
        const origin = req.headers.get('origin') || 'https://webyan.com';
        const portalInfo = rolePortals[staffRole];
        
        const permissions = [];
        if (can_reply_tickets || staffRole === 'support_agent' || staffRole === 'admin') {
          permissions.push('الرد على التذاكر');
        }
        if (can_manage_content || staffRole === 'editor' || staffRole === 'admin') {
          permissions.push('إدارة المحتوى');
        }
        if (can_attend_meetings || staffRole === 'support_agent' || staffRole === 'admin') {
          permissions.push('حضور الاجتماعات');
        }

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'ويبيان <noreply@webyan.com>',
            to: [cleanEmail],
            subject: 'مرحباً بك في فريق ويبيان - بيانات الدخول',
            html: `
              <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">مرحباً بك في فريق ويبيان</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                  <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">
                    مرحباً <strong>${cleanName}</strong>،
                  </p>
                  <p style="color: #4b5563; line-height: 1.8; margin-bottom: 20px;">
                    تم إنشاء حسابك بنجاح كـ <strong>${roleNames[staffRole]}</strong> في نظام ويبيان.
                  </p>
                  
                  <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #0369a1;"><strong>البوابة:</strong> ${portalInfo.name}</p>
                    ${job_title ? `<p style="margin: 10px 0 0 0; color: #0369a1;"><strong>المنصب:</strong> ${job_title}</p>` : ''}
                  </div>
                  
                  ${permissions.length > 0 ? `
                  <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0 0 10px 0; color: #065f46;"><strong>الصلاحيات:</strong></p>
                    <ul style="margin: 0; padding-right: 20px; color: #047857;">
                      ${permissions.map(p => `<li style="margin: 5px 0;">${p}</li>`).join('')}
                    </ul>
                  </div>
                  ` : ''}
                  
                  <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 16px;">🔐 بيانات الدخول:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #78350f; font-weight: bold;">البريد الإلكتروني:</td>
                        <td style="padding: 8px 0; color: #1f2937; direction: ltr; text-align: left;">${cleanEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #78350f; font-weight: bold;">كلمة المرور:</td>
                        <td style="padding: 8px 0; color: #1f2937; direction: ltr; text-align: left; font-family: monospace; letter-spacing: 1px;">${password}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${origin}${portalInfo.path}" 
                       style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                      الدخول إلى ${portalInfo.name}
                    </a>
                  </div>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #ef4444; font-size: 14px; margin: 0;">
                      ⚠️ <strong>هام:</strong> ننصحك بتغيير كلمة المرور بعد أول تسجيل دخول من صفحة الإعدادات.
                    </p>
                  </div>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} ويبيان - جميع الحقوق محفوظة</p>
                </div>
              </div>
            `,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the whole operation if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        staff_id: staffData.id,
        user_id: userId,
        role: staffRole,
        message: isNewUser 
          ? `تم إنشاء حساب ${roleNames[staffRole]} بنجاح وإرسال بيانات الدخول`
          : `تم ربط الموظف بالحساب الموجود وتعيينه كـ ${roleNames[staffRole]}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error creating staff account:', error);
    const errorMessage = error instanceof Error ? error.message : 'فشل إنشاء حساب الموظف';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
