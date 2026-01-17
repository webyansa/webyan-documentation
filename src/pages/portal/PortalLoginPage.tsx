import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Mail, Lock, Eye, EyeOff, Loader2, Shield, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import webyanLogo from '@/assets/webyan-logo.svg';
import { rolesInfo, type AppRole } from '@/lib/permissions';

export default function PortalLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, authStatus, loading } = useAuth();

  const params = new URLSearchParams(location.search);
  const returnUrlParam = params.get('returnUrl');
  const reason = params.get('reason');
  const safeReturnUrl = returnUrlParam && returnUrlParam.startsWith('/portal') ? returnUrlParam : '/portal';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect based on role after login
  useEffect(() => {
    if (user && !loading && authStatus === 'authenticated') {
      setIsRedirecting(true);
      
      // Fetch user type and redirect accordingly
      supabase.rpc('get_user_type', { _user_id: user.id })
        .then(({ data, error: rpcError }) => {
          if (rpcError || !data || data.length === 0) {
            setIsRedirecting(false);
            return;
          }
          
          const userType = data[0]?.user_type as AppRole | null;
          
          if (userType && rolesInfo[userType]) {
            const targetPath = rolesInfo[userType].dashboardPath;
            // For clients, use the return URL if available
            if (userType === 'client') {
              navigate(safeReturnUrl, { replace: true });
            } else {
              navigate(targetPath, { replace: true });
            }
          } else {
            setIsRedirecting(false);
          }
        });
    }
  }, [user, loading, authStatus, navigate, safeReturnUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('بيانات الدخول غير صحيحة');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('يرجى تأكيد بريدك الإلكتروني أولاً');
        } else {
          setError('حدث خطأ أثناء تسجيل الدخول');
        }
        return;
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        setError('حدث خطأ أثناء تسجيل الدخول');
        return;
      }

      // Check user type
      const { data: userTypeData } = await supabase.rpc('get_user_type', { _user_id: currentUser.id });
      
      if (userTypeData && userTypeData.length > 0) {
        const userType = userTypeData[0]?.user_type as AppRole;
        
        // If user is not a client, redirect to appropriate portal
        if (userType !== 'client' && rolesInfo[userType]) {
          toast.info(`سيتم توجيهك إلى ${rolesInfo[userType].name === 'مدير' || rolesInfo[userType].name === 'محرر' ? 'لوحة التحكم' : 'بوابتك'}`);
          navigate(rolesInfo[userType].dashboardPath, { replace: true });
          return;
        }
      }

      // For clients, check client_accounts
      const { data: clientAccount } = await supabase
        .from('client_accounts')
        .select('id, is_active')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!clientAccount) {
        setError('هذا الحساب غير مسجل كعميل في النظام');
        await supabase.auth.signOut();
        return;
      }

      if (!clientAccount.is_active) {
        setError('تم تعطيل هذا الحساب. يرجى التواصل مع الدعم');
        await supabase.auth.signOut();
        return;
      }

      await supabase
        .from('client_accounts')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', clientAccount.id);

      toast.success('تم تسجيل الدخول بنجاح');
      navigate(safeReturnUrl, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {isRedirecting ? 'جاري التوجيه للبوابة المناسبة...' : 'جاري التحقق من الحساب...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/50 to-background flex flex-col" dir="rtl">
      {/* Minimal Portal Header (security by design) */}
      <header className="p-4">
        <div className="mx-auto max-w-5xl flex items-center gap-3">
          <img src={webyanLogo} alt="ويبيان" className="h-8 w-auto" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">بوابة العملاء</span>
            <span className="text-xs text-muted-foreground">تسجيل الدخول</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-green-200/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">بوابة العملاء</CardTitle>
            <CardDescription>سجل دخولك للوصول إلى بوابة عملاء ويبيان</CardDescription>
          </CardHeader>

          <CardContent>
            {reason === 'timeout' && (
              <Alert className="mb-4">
                <AlertDescription>
                  تعذر التحقق من الجلسة بسرعة. يمكنك تسجيل الدخول الآن أو إعادة تحميل الصفحة.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 pl-10"
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    دخول البوابة
                  </>
                )}
              </Button>
            </form>

            <Alert className="mt-4 bg-green-50 border-green-200">
              <AlertDescription className="text-sm text-green-800">
                إذا كنت عميلاً جديداً، سيتم إنشاء حسابك من قبل فريق ويبيان وإرسال بيانات الدخول إلى بريدك الإلكتروني.
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 text-center pt-4 border-t">
            <Link 
              to="/portal/forgot-password" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              نسيت كلمة المرور؟
            </Link>
            <div className="flex flex-col gap-2 w-full">
              <p className="text-sm text-muted-foreground">هل أنت موظف أو مدير؟</p>
              <div className="flex gap-2">
                <Button variant="outline" asChild className="flex-1 gap-1">
                  <Link to="/admin/login">
                    <Shield className="h-4 w-4" />
                    لوحة التحكم
                  </Link>
                </Button>
                <Button variant="outline" asChild className="flex-1 gap-1">
                  <Link to="/support/login">
                    <Headphones className="h-4 w-4" />
                    بوابة الدعم
                  </Link>
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ويبيان. جميع الحقوق محفوظة.
      </footer>
    </div>
  );
}
