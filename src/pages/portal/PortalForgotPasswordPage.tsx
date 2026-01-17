import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Mail, CheckCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import webyanLogo from "@/assets/webyan-logo.svg";

const PortalForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/portal/reset-password`;
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        if (resetError.message.includes("rate limit")) {
          setError("تم إرسال طلبات كثيرة، يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.");
        } else {
          setError(resetError.message);
        }
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

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
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">نسيت كلمة المرور؟</CardTitle>
            <CardDescription className="text-base">
              {success 
                ? "تم إرسال رابط إعادة التعيين بنجاح"
                : "أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-6">
                <Alert className="bg-green-500/10 border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    تم إرسال رابط إعادة تعيين كلمة المرور إلى <strong>{email}</strong>. 
                    يرجى التحقق من بريدك الإلكتروني (بما في ذلك مجلد الرسائل غير المرغوب فيها).
                  </AlertDescription>
                </Alert>
                
                <div className="text-center text-sm text-muted-foreground">
                  لم تستلم الرسالة؟{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setSuccess(false);
                      setEmail("");
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    أعد المحاولة
                  </button>
                </div>

                <Link to="/portal/login">
                  <Button variant="outline" className="w-full gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    العودة لتسجيل الدخول
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
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="أدخل بريدك الإلكتروني"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="text-right"
                    dir="ltr"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full gap-2" 
                  disabled={loading || !email.trim()}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      إرسال رابط إعادة التعيين
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Link 
                    to="/portal/login" 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    ← العودة لتسجيل الدخول
                  </Link>
                </div>
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

export default PortalForgotPasswordPage;
