import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, ArrowRight, BookOpen, Shield, Users, Building2 } from 'lucide-react';
import { z } from 'zod';
import webyanLogo from '@/assets/webyan-logo.svg';

const emailSchema = z.string().email('البريد الإلكتروني غير صالح');
const passwordSchema = z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
const fullNameSchema = z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل');

type LoginMode = 'select' | 'admin' | 'staff';

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, isAdmin, isAdminOrEditor } = useAuth();
  const { isStaff, loading: staffLoading } = useStaffAuth();
  const [loginMode, setLoginMode] = useState<LoginMode>('select');
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const checkUserRoleAndRedirect = async () => {
      if (user && !loading && !staffLoading && !isRedirecting) {
        setIsRedirecting(true);
        
        // Priority 1: Check if admin
        if (isAdmin || isAdminOrEditor) {
          navigate('/admin', { replace: true });
          return;
        }
        
        // Priority 2: Check if staff
        if (isStaff) {
          navigate('/staff', { replace: true });
          return;
        }
        
        // Priority 3: Check if client
        const { data: clientData } = await supabase
          .from('client_accounts')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (clientData) {
          navigate('/portal', { replace: true });
          return;
        }
        
        // Default: Home page for visitors
        navigate('/', { replace: true });
      }
    };
    
    checkUserRoleAndRedirect();
  }, [user, loading, staffLoading, isAdmin, isAdminOrEditor, isStaff, navigate, isRedirecting]);

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
          <Card className="w-full max-w-lg shadow-xl border-border/50">
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
                className="w-full p-6 rounded-xl border-2 border-border hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 text-right group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">موظفي الدعم الفني</h3>
                    <p className="text-sm text-muted-foreground">
                      للموظفين المسؤولين عن الدعم الفني والمحتوى والاجتماعات
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                </div>
              </button>

              {/* Admin Login Option */}
              <button
                onClick={() => setLoginMode('admin')}
                className="w-full p-6 rounded-xl border-2 border-border hover:border-red-300 hover:bg-red-50/50 transition-all duration-200 text-right group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-red-100 group-hover:bg-red-200 transition-colors">
                    <Shield className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">الإداريين والمحررين</h3>
                    <p className="text-sm text-muted-foreground">
                      للمسؤولين والمديرين للوصول إلى لوحة التحكم الرئيسية الكاملة
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-red-600 transition-colors" />
                </div>
              </button>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">هل أنت عميل؟</p>
              <Button variant="outline" asChild className="w-full gap-2">
                <Link to="/portal-login">
                  <Building2 className="h-4 w-4" />
                  الدخول لبوابة العملاء
                </Link>
              </Button>
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
            <div className={`mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center ${
              loginMode === 'staff' ? 'bg-blue-100' : 'bg-red-100'
            }`}>
              {loginMode === 'staff' ? (
                <Users className="h-8 w-8 text-blue-600" />
              ) : (
                <Shield className="h-8 w-8 text-red-600" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              {loginMode === 'staff' ? 'دخول موظفي الدعم' : 'دخول الإداريين'}
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
              onClick={() => {
                setLoginMode('select');
                setError('');
                setSuccess('');
              }}
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

                  <Button 
                    type="submit" 
                    className={`w-full ${loginMode === 'staff' ? 'bg-blue-600 hover:bg-blue-700' : ''}`} 
                    disabled={isSubmitting}
                  >
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

          <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground border-t pt-4">
            {loginMode === 'staff' ? (
              <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm">
                <Users className="h-4 w-4 inline-block ml-1" />
                حسابات الموظفين يتم إنشاؤها من قبل الإدارة فقط.
                <br />
                تواصل مع المدير للحصول على حساب.
              </div>
            ) : (
              <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-sm">
                <Shield className="h-4 w-4 inline-block ml-1" />
                المستخدمون الجدد يحصلون على صلاحية "زائر" افتراضياً.
                <br />
                تواصل مع المدير للحصول على صلاحيات إدارية.
              </div>
            )}
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
