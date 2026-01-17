import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Mail, Lock, Eye, EyeOff, Home, Loader2, Shield, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import webyanLogo from '@/assets/webyan-logo.svg';

export default function PortalLoginPage() {
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkClientStatus = async () => {
      if (user && !authLoading) {
        const { data: clientData } = await supabase
          .from('client_accounts')
          .select('id, is_active')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (clientData?.is_active) {
          navigate('/portal', { replace: true });
        }
      }
    };
    
    checkClientStatus();
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    
    try {
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('بيانات الدخول غير صحيحة');
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
      navigate('/portal');

    } catch (error) {
      console.error('Login error:', error);
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري التحقق من الحساب...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/50 to-background flex flex-col" dir="rtl">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
          <img src={webyanLogo} alt="ويبيان" className="h-8 w-auto" />
        </Link>
        <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
          العودة للرئيسية
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-green-200/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">بوابة العملاء</CardTitle>
            <CardDescription>
              سجل دخولك للوصول إلى بوابة عملاء ويبيان
            </CardDescription>
          </CardHeader>
          
          <CardContent>
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
                    disabled={loading}
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
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700 gap-2"
                disabled={loading}
              >
                {loading ? (
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
            <p className="text-sm text-muted-foreground">
              لست عميلاً؟{' '}
              <Link to="/submit-ticket" className="text-primary hover:underline">
                تواصل معنا
              </Link>
            </p>
            
            <div className="flex flex-col gap-2 w-full">
              <p className="text-sm text-muted-foreground">هل تريد الوصول إلى بوابة أخرى؟</p>
              <div className="flex gap-2">
                <Button variant="outline" asChild className="flex-1 gap-1 text-xs">
                  <Link to="/admin/login">
                    <Shield className="h-4 w-4" />
                    لوحة التحكم
                  </Link>
                </Button>
                <Button variant="outline" asChild className="flex-1 gap-1 text-xs">
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
