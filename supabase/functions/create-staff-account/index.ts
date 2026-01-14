import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      throw new Error('Invalid token');
    }

    // Check if caller is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can create staff accounts');
    }

    const { 
      full_name, 
      email, 
      password, 
      phone, 
      job_title, 
      is_active,
      can_reply_tickets,
      can_manage_content,
      can_attend_meetings
    } = await req.json();

    // Validate required fields
    if (!full_name || !email || !password) {
      throw new Error('Missing required fields: full_name, email, password');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check if email already exists in staff_members
    const { data: existingStaff } = await supabaseAdmin
      .from('staff_members')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingStaff) {
      throw new Error('هذا البريد الإلكتروني مسجل بالفعل كموظف');
    }

    // Check if user exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    let userId: string;

    if (existingUser) {
      // Use existing user
      userId = existingUser.id;
      
      // Update user role to editor if they don't have a role yet
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', existingUser.id)
        .single();
      
      if (!existingRole || existingRole.role === 'viewer') {
        await supabaseAdmin
          .from('user_roles')
          .upsert({ user_id: existingUser.id, role: 'editor' });
      }
    } else {
      // Create new user in auth
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          is_staff: true
        }
      });

      if (createError) {
        throw createError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      userId = authData.user.id;

      // Assign editor role to new staff
      await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: userId, role: 'editor' });
    }

    // Create staff member record
    const { error: staffError, data: staffData } = await supabaseAdmin
      .from('staff_members')
      .insert({
        user_id: userId,
        full_name,
        email,
        phone: phone || null,
        job_title: job_title || null,
        is_active: is_active ?? true,
        can_reply_tickets: can_reply_tickets ?? false,
        can_manage_content: can_manage_content ?? false,
        can_attend_meetings: can_attend_meetings ?? false
      })
      .select()
      .single();

    if (staffError) {
      // If user was just created, rollback
      if (!existingUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      throw staffError;
    }

    // Send welcome email with login credentials
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && !existingUser) {
      try {
        const permissions = [];
        if (can_reply_tickets) permissions.push('الرد على التذاكر');
        if (can_manage_content) permissions.push('إدارة المحتوى');
        if (can_attend_meetings) permissions.push('حضور الاجتماعات');

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'ويبيان <noreply@webyan.com>',
            to: [email],
            subject: 'مرحباً بك في فريق ويبيان',
            html: `
              <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">مرحباً بك في فريق ويبيان</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                  <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">
                    مرحباً <strong>${full_name}</strong>،
                  </p>
                  <p style="color: #4b5563; line-height: 1.8; margin-bottom: 20px;">
                    تم إنشاء حسابك كموظف في نظام ويبيان. يمكنك الآن الوصول إلى لوحة التحكم لإدارة المهام الموكلة إليك.
                  </p>
                  
                  ${job_title ? `
                  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #374151;"><strong>المنصب:</strong> ${job_title}</p>
                  </div>
                  ` : ''}
                  
                  ${permissions.length > 0 ? `
                  <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0 0 10px 0; color: #065f46;"><strong>الصلاحيات:</strong></p>
                    <ul style="margin: 0; padding-right: 20px; color: #047857;">
                      ${permissions.map(p => `<li>${p}</li>`).join('')}
                    </ul>
                  </div>
                  ` : ''}
                  
                  <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <h3 style="color: #1e40af; margin: 0 0 15px 0;">بيانات الدخول:</h3>
                    <p style="margin: 5px 0; color: #1e3a8a;"><strong>البريد الإلكتروني:</strong> ${email}</p>
                    <p style="margin: 5px 0; color: #1e3a8a;"><strong>كلمة المرور:</strong> ${password}</p>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${req.headers.get('origin') || 'https://webyan.com'}/auth" 
                       style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                      الدخول للنظام
                    </a>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                    ننصحك بتغيير كلمة المرور بعد أول تسجيل دخول من صفحة الإعدادات.
                  </p>
                </div>
              </div>
            `,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        staff_id: staffData.id,
        user_id: userId,
        message: existingUser 
          ? 'تم ربط حساب الموظف بالحساب الموجود بنجاح' 
          : 'تم إنشاء حساب الموظف بنجاح وإرسال بيانات الدخول'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error creating staff account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create staff account';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
