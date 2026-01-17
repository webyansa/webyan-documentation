import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, CheckCircle, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import webyanLogo from "@/assets/webyan-logo.svg";

const PortalResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If user arrived via password reset link, they should have a session
      if (session) {
        setValidToken(true);
      } else {
        // Check URL hash for access token (Supabase sends it in fragment)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const type = hashParams.get("type");
        
        if (accessToken && type === "recovery") {
          setValidToken(true);
        } else {
          setValidToken(false);
        }
      }
    };

    checkSession();

    // Listen for auth state changes (when Supabase processes the recovery token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidToken(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    }
    if (!/[A-Za-z]/.test(pwd)) {
      return "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل";
    }
    if (!/[0-9]/.test(pwd)) {
      return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      
      // Redirect to portal after 3 seconds
      setTimeout(() => {
        navigate("/portal");
      }, 3000);
    } catch (err) {
      setError("حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  // Still checking token validity
  if (validToken === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">جاري التحقق من الرابط...</p>
        </div>
      </div>
    );
  }

  // Invalid or expired token
  if (validToken === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/portal/login" className="inline-flex items-center gap-3 mb-4">
              <img src={webyanLogo} alt="Webyan" className="h-10 w-10" />
              <span className="text-xl font-bold text-foreground">بوابة العملاء</span>
            </Link>
          </div>

          <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl">رابط غير صالح</CardTitle>
              <CardDescription className="text-base">
                رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/portal/forgot-password">
                <Button className="w-full">
                  طلب رابط جديد
                </Button>
              </Link>
              <Link to="/portal/login">
                <Button variant="outline" className="w-full">
                  العودة لتسجيل الدخول
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Simple Header - Portal branding only */}
        <div className="text-center mb-8">
          <Link to="/portal/login" className="inline-flex items-center gap-3 mb-4">
            <img src={webyanLogo} alt="Webyan" className="h-10 w-10" />
            <span className="text-xl font-bold text-foreground">بوابة العملاء</span>
          </Link>
        </div>

        <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              {success ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <KeyRound className="h-6 w-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {success ? "تم تغيير كلمة المرور" : "إعادة تعيين كلمة المرور"}
            </CardTitle>
            <CardDescription className="text-base">
              {success 
                ? "تم تحديث كلمة المرور بنجاح. جاري تحويلك..."
                : "أدخل كلمة المرور الجديدة"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-6">
                <Alert className="bg-green-500/10 border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    تم تغيير كلمة المرور بنجاح! سيتم تحويلك إلى بوابة العملاء خلال ثوانٍ...
                  </AlertDescription>
                </Alert>
                
                <Link to="/portal">
                  <Button className="w-full">
                    الذهاب إلى بوابة العملاء
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="أدخل كلمة المرور الجديدة"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    8 أحرف على الأقل، تتضمن حرفاً ورقماً
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="أعد إدخال كلمة المرور"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    dir="ltr"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !password || !confirmPassword}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      جاري الحفظ...
                    </>
                  ) : (
                    "حفظ كلمة المرور الجديدة"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Webyan. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
};

export default PortalResetPasswordPage;
