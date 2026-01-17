import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, ArrowRight, Home, Headphones, Shield, Building2 } from 'lucide-react';
import { z } from 'zod';
import webyanLogo from '@/assets/webyan-logo.svg';

const emailSchema = z.string().email('البريد الإلكتروني غير صالح');
const passwordSchema = z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');

export default function SupportLoginPage() {
  const navigate = useNavigate();
  const { user, loading, signIn, isAdminOrEditor } = useAuth();
  const { isStaff, loading: staffLoading } = useStaffAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading && !staffLoading) {
      if (isStaff) {
        navigate('/support', { replace: true });
      } else if (isAdminOrEditor) {
        navigate('/admin', { replace: true });
      }
    }
  }, [user, loading, staffLoading, isStaff, isAdminOrEditor, navigate]);

  const validateInputs = () => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateInputs()) return;
    
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      setIsSubmitting(false);
      if (error.message.includes('Invalid login credentials')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (error.message.includes('Email not confirmed')) {
        setError('يرجى تأكيد بريدك الإلكتروني أولاً');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول');
      }
    }
  };

  if (loading || staffLoading) {
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-background flex flex-col" dir="rtl">
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
        <Card className="w-full max-w-md shadow-xl border-blue-200/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Headphones className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">بوابة الدعم الفني</CardTitle>
            <CardDescription>
              سجل دخولك للوصول إلى بوابة موظفي الدعم الفني
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
                <Label htmlFor="login-email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="example@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 ml-2" />
                )}
                تسجيل الدخول
              </Button>
            </form>

            <Alert className="mt-4">
              <AlertDescription className="text-sm">
                حسابات الموظفين يتم إنشاؤها من قبل الإدارة. إذا كنت موظفاً جديداً، يرجى التواصل مع المسؤول.
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 text-center pt-4 border-t">
            <div className="flex flex-col gap-2 w-full">
              <p className="text-sm text-muted-foreground">هل تريد الوصول إلى بوابة أخرى؟</p>
              <div className="flex gap-2">
                <Button variant="outline" asChild className="flex-1 gap-1">
                  <Link to="/admin/login">
                    <Shield className="h-4 w-4" />
                    لوحة التحكم
                  </Link>
                </Button>
                <Button variant="outline" asChild className="flex-1 gap-1">
                  <Link to="/portal/login">
                    <Building2 className="h-4 w-4" />
                    بوابة العملاء
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
