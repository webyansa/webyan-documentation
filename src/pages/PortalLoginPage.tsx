import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import webyanLogo from '@/assets/webyan-logo.svg';

const PortalLoginPage = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    
    try {
      // Sign in
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          toast.error('بيانات الدخول غير صحيحة');
        } else {
          toast.error('حدث خطأ أثناء تسجيل الدخول');
        }
        return;
      }

      // Check if user is a client
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('حدث خطأ أثناء تسجيل الدخول');
        return;
      }

      const { data: clientAccount } = await supabase
        .from('client_accounts')
        .select('id, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientAccount) {
        toast.error('هذا الحساب غير مسجل كعميل في النظام');
        await supabase.auth.signOut();
        return;
      }

      if (!clientAccount.is_active) {
        toast.error('تم تعطيل هذا الحساب. يرجى التواصل مع الدعم');
        await supabase.auth.signOut();
        return;
      }

      // Update last login
      await supabase
        .from('client_accounts')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', clientAccount.id);

      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/portal');

    } catch (error) {
      console.error('Login error:', error);
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4" dir="rtl">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to home */}
        <Link 
          to="/" 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          العودة للرئيسية
        </Link>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <img src={webyanLogo} alt="ويبيان" className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold">بوابة عملاء ويبيان</CardTitle>
            <CardDescription className="text-base">
              سجل دخولك للوصول إلى بوابة العملاء
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10 h-12 text-base"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 pl-10 h-12 text-base"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  <>
                    <Building2 className="w-5 h-5" />
                    دخول البوابة
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">ملاحظة للعملاء</p>
                  <p>
                    إذا كنت عميلاً جديداً، سيتم إنشاء حسابك من قبل فريق ويبيان وإرسال بيانات الدخول إلى بريدك الإلكتروني.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                لست عميلاً؟{' '}
                <Link 
                  to="/submit-ticket"
                  className="text-primary hover:underline"
                >
                  تواصل معنا
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                موظف أو إداري؟{' '}
                <Link 
                  to="/auth"
                  className="text-primary hover:underline"
                >
                  سجل دخولك من هنا
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} ويبيان. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
};

export default PortalLoginPage;
