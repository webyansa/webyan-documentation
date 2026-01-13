import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Upload, X, CheckCircle, User, Mail, Globe, MessageSquare, AlertTriangle, HelpCircle, Bug, Lightbulb } from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Breadcrumb } from "@/components/docs/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const categories = [
  { id: 'technical', label: 'مشكلة تقنية', icon: Bug, color: 'text-red-500' },
  { id: 'question', label: 'استفسار عام', icon: HelpCircle, color: 'text-blue-500' },
  { id: 'suggestion', label: 'اقتراح تحسين', icon: Lightbulb, color: 'text-yellow-500' },
  { id: 'complaint', label: 'شكوى', icon: AlertTriangle, color: 'text-orange-500' },
];

const priorities = [
  { id: 'low', label: 'منخفضة', color: 'bg-green-100 text-green-700' },
  { id: 'medium', label: 'متوسطة', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'high', label: 'عالية', color: 'bg-red-100 text-red-700' },
];

export default function SubmitTicketPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    subject: '',
    description: '',
    websiteUrl: '',
    category: 'technical',
    priority: 'medium',
  });

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let screenshotUrl = null;

      // Upload screenshot if exists
      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `ticket-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('docs-media')
          .upload(`tickets/${fileName}`, screenshot);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('docs-media')
          .getPublicUrl(`tickets/${fileName}`);
        
        screenshotUrl = urlData.publicUrl;
      }

      let ticket;

      if (user?.id) {
        // Authenticated user - insert directly
        const { data, error } = await supabase
          .from('support_tickets')
          .insert({
            user_id: user.id,
            subject: formData.subject,
            description: formData.description,
            website_url: formData.websiteUrl || null,
            screenshot_url: screenshotUrl,
            category: formData.category,
            priority: formData.priority,
          } as any)
          .select()
          .single();

        if (error) throw error;
        ticket = data;
      } else {
        // Guest user - use edge function
        const { data, error } = await supabase.functions.invoke('create-guest-ticket', {
          body: {
            guestName: formData.guestName,
            guestEmail: formData.guestEmail,
            subject: formData.subject,
            description: formData.description,
            websiteUrl: formData.websiteUrl || null,
            screenshotUrl: screenshotUrl,
            category: formData.category,
            priority: formData.priority,
          },
        });

        if (error) throw error;
        ticket = data;
      }

      // Send email notification to customer and admin
      const email = user?.email || formData.guestEmail;
      const customerName = user?.email || formData.guestName || formData.guestEmail;
      if (email) {
        await supabase.functions.invoke('send-ticket-notification', {
          body: {
            email,
            ticketNumber: ticket.ticket_number,
            subject: formData.subject,
            type: 'created',
            siteUrl: window.location.origin,
            customerName,
          },
        });
      }

      setTicketNumber(ticket.ticket_number);
      setSubmitted(true);

      toast({
        title: "تم إرسال التذكرة بنجاح",
        description: `رقم التذكرة: ${ticket.ticket_number}`,
      });
    } catch (error: any) {
      console.error('Error submitting ticket:', error);
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <DocsLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-pulse">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4">تم إرسال تذكرتك بنجاح! 🎉</h1>
          <div className="bg-muted rounded-xl p-6 mb-6">
            <p className="text-muted-foreground mb-2">رقم التذكرة</p>
            <p className="text-3xl font-mono font-bold text-primary">{ticketNumber}</p>
          </div>
          <p className="text-muted-foreground mb-8">
            سيتم الرد على تذكرتك في أقرب وقت ممكن. 
            {user ? ' يمكنك متابعة حالة التذكرة من صفحة تذاكري.' : ' تم إرسال رسالة تأكيد على بريدك الإلكتروني.'}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/')}>
              العودة للرئيسية
            </Button>
            {user && (
              <Button variant="outline" onClick={() => navigate('/my-tickets')}>
                عرض تذاكري
              </Button>
            )}
          </div>
        </div>
      </DocsLayout>
    );
  }

  return (
    <DocsLayout>
      <div className="max-w-3xl mx-auto">
        <Breadcrumb items={[{ label: "تقديم تذكرة دعم" }]} className="mb-6" />

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-4">كيف يمكننا مساعدتك؟</h1>
          <p className="text-muted-foreground text-lg">
            فريق الدعم جاهز لمساعدتك في حل أي مشكلة تواجهها
          </p>
        </div>

        <Tabs defaultValue={user ? "authenticated" : "guest"} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="guest" className="gap-2">
              <Send className="h-4 w-4" />
              إبلاغ سريع
            </TabsTrigger>
            <TabsTrigger value="authenticated" className="gap-2" disabled={!user}>
              <User className="h-4 w-4" />
              {user ? 'تذكرة من حسابي' : 'سجل دخول أولاً'}
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit}>
            <TabsContent value="guest">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    معلومات التواصل
                  </CardTitle>
                  <CardDescription>حتى نتمكن من الرد عليك</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="guestName">الاسم</Label>
                    <Input
                      id="guestName"
                      placeholder="أدخل اسمك"
                      value={formData.guestName}
                      onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                      required={!user}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guestEmail">البريد الإلكتروني</Label>
                    <Input
                      id="guestEmail"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.guestEmail}
                      onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                      required={!user}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="authenticated">
              {user && (
                <Card className="mb-6 bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">مرحباً، {user.email}</p>
                        <p className="text-sm text-muted-foreground">سيتم ربط هذه التذكرة بحسابك</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Category Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  نوع الطلب
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        formData.category === cat.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <cat.icon className={`h-6 w-6 mx-auto mb-2 ${cat.color}`} />
                      <span className="text-sm font-medium">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Priority */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>الأولوية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  {priorities.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p.id })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.priority === p.id
                          ? p.color + ' ring-2 ring-offset-2 ring-primary'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ticket Details */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>تفاصيل التذكرة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">عنوان المشكلة</Label>
                  <Input
                    id="subject"
                    placeholder="اكتب عنواناً موجزاً للمشكلة"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">وصف المشكلة</Label>
                  <Textarea
                    id="description"
                    placeholder="اشرح المشكلة بالتفصيل... ما الذي كنت تحاول القيام به؟ ما الذي حدث؟"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-[150px]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    رابط الموقع (اختياري)
                  </Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    placeholder="https://..."
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  />
                </div>

                {/* Screenshot Upload */}
                <div className="space-y-2">
                  <Label>صورة توضيحية (اختياري)</Label>
                  {screenshotPreview ? (
                    <div className="relative">
                      <img
                        src={screenshotPreview}
                        alt="Screenshot preview"
                        className="w-full max-h-64 object-contain rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 left-2"
                        onClick={removeScreenshot}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          اضغط لرفع صورة أو اسحبها هنا
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleScreenshotChange}
                      />
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>جاري الإرسال...</>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  إرسال التذكرة
                </>
              )}
            </Button>
          </form>
        </Tabs>
      </div>
    </DocsLayout>
  );
}
