import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, ArrowRight, BookOpen, Shield, Users } from 'lucide-react';
import { z } from 'zod';
import webyanLogo from '@/assets/webyan-logo.svg';

const emailSchema = z.string().email('البريد الإلكتروني غير صالح');
const passwordSchema = z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
const fullNameSchema = z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل');

type LoginMode = 'select' | 'admin' | 'staff';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signIn, signUp } = useAuth();
  const { isStaff } = useStaffAuth();
  const [loginMode, setLoginMode] = useState<LoginMode>('select');
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectParam = new URLSearchParams(location.search).get('redirect');

  useEffect(() => {
    const checkUserRole = async () => {
      if (user && !loading) {
        // Check if user is admin
        const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });

        if (isAdmin) {
          if (redirectParam && redirectParam.startsWith('/admin')) {
            navigate(redirectParam, { replace: true });
          } else {
            navigate('/admin', { replace: true });
          }
          return;
        }

        // Check if user is staff
        const { data: staffData } = await supabase.rpc('is_staff', { _user_id: user.id });

        if (staffData) {
          if (redirectParam && redirectParam.startsWith('/staff')) {
            navigate(redirectParam, { replace: true });
          } else {
            navigate('/staff', { replace: true });
          }
          return;
        }

        // Default redirect
        navigate('/', { replace: true });
      }
    };

    checkUserRole();
  }, [user, loading, navigate, redirectParam]);

  const validateInputs = (isSignUp: boolean) => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (isSignUp) {
        fullNameSchema.parse(fullName);
      }
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
    
    if (!validateInputs(false)) return;
    
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
      return;
    }

    // Navigation will be handled by useEffect
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateInputs(true)) return;
    
    setIsSubmitting(true);
    const { error } = await signUp(email, password, fullName);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('User already registered')) {
        setError('هذا البريد الإلكتروني مسجل بالفعل');
      } else if (error.message.includes('Password')) {
        setError('كلمة المرور ضعيفة جداً');
      } else {
        setError('حدث خطأ أثناء إنشاء الحساب');
      }
    } else {
      setSuccess('تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Login Mode Selection Screen
  if (loginMode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col" dir="rtl">
        {/* Header */}
        <header className="p-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <img src={webyanLogo} alt="ويبيان" className="h-8 w-auto" />
          </Link>
          <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <BookOpen className="h-4 w-4" />
            العودة للدليل
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
              <CardDescription>
                اختر نوع الحساب للمتابعة
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Staff Login Option */}
              <button
                onClick={() => setLoginMode('staff')}
                className="w-full p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-right group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">دخول الموظفين</h3>
                    <p className="text-sm text-muted-foreground">
                      للموظفين المسؤولين عن الدعم الفني والتدريب
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>

              {/* Admin Login Option */}
              <button
                onClick={() => setLoginMode('admin')}
                className="w-full p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-right group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">دخول الإدارة</h3>
                    <p className="text-sm text-muted-foreground">
                      للمسؤولين والمديرين للوصول للوحة التحكم الرئيسية
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground pt-2">
              <Link to="/portal-login" className="text-primary hover:underline">
                هل أنت عميل؟ ادخل لبوابة العملاء
              </Link>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  // Login Form Screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
          <img src={webyanLogo} alt="ويبيان" className="h-8 w-auto" />
        </Link>
        <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <BookOpen className="h-4 w-4" />
          العودة للدليل
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {loginMode === 'staff' ? (
                <Users className="h-8 w-8 text-primary" />
              ) : (
                <Shield className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              {loginMode === 'staff' ? 'دخول الموظفين' : 'دخول الإدارة'}
            </CardTitle>
            <CardDescription>
              {loginMode === 'staff' 
                ? 'سجل دخولك للوصول إلى بوابة الموظفين'
                : 'سجل دخولك للوصول إلى لوحة تحكم الإدارة'
              }
            </CardDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLoginMode('select')}
              className="mt-2 text-muted-foreground"
            >
              ← تغيير نوع الحساب
            </Button>
          </CardHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {loginMode === 'admin' && (
              <TabsList className="grid w-full grid-cols-2 mx-auto max-w-xs mb-4">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="signup">حساب جديد</TabsTrigger>
              </TabsList>
            )}

            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="mb-4 border-green-500 bg-green-50 text-green-700">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login" className="mt-0">
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

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <ArrowRight className="h-4 w-4 ml-2" />
                    )}
                    تسجيل الدخول
                  </Button>
                </form>
              </TabsContent>

              {loginMode === 'admin' && (
                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">الاسم الكامل</Label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="أحمد محمد"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pr-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
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
                      <Label htmlFor="signup-password">كلمة المرور</Label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pr-10"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        6 أحرف على الأقل
                      </p>
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      ) : (
                        <ArrowRight className="h-4 w-4 ml-2" />
                      )}
                      إنشاء حساب
                    </Button>
                  </form>
                </TabsContent>
              )}
            </CardContent>
          </Tabs>

          <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
            {loginMode === 'staff' ? (
              <p>
                حسابات الموظفين يتم إنشاؤها من قبل الإدارة فقط
              </p>
            ) : (
              <>
                <p>
                  المستخدمون الجدد يحصلون على صلاحية "زائر" افتراضياً.
                </p>
                <p>
                  تواصل مع المدير للحصول على صلاحيات أعلى.
                </p>
              </>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
