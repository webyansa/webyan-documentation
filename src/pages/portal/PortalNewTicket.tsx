import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Ticket, 
  ArrowRight,
  Upload,
  X,
  Loader2,
  Monitor,
  CreditCard,
  Sparkles,
  GraduationCap,
  MoreHorizontal,
  Clock,
  AlertTriangle,
  Zap,
  Flame,
  CheckCircle2,
  Send,
  FileImage,
  Link as LinkIcon,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const categories = [
  { value: 'technical', label: 'مشكلة تقنية', icon: Monitor, color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400', activeColor: 'bg-red-100 border-red-400 ring-2 ring-red-200' },
  { value: 'billing', label: 'الفواتير', icon: CreditCard, color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400', activeColor: 'bg-amber-100 border-amber-400 ring-2 ring-amber-200' },
  { value: 'feature', label: 'طلب ميزة', icon: Sparkles, color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-400', activeColor: 'bg-purple-100 border-purple-400 ring-2 ring-purple-200' },
  { value: 'training', label: 'التدريب والدعم', icon: GraduationCap, color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400', activeColor: 'bg-blue-100 border-blue-400 ring-2 ring-blue-200' },
  { value: 'other', label: 'أخرى', icon: MoreHorizontal, color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400', activeColor: 'bg-gray-100 border-gray-400 ring-2 ring-gray-200' },
];

const priorities = [
  { value: 'low', label: 'منخفضة', icon: Clock, description: 'يمكن الانتظار', color: 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100', activeColor: 'bg-slate-100 border-slate-400 ring-2 ring-slate-200' },
  { value: 'medium', label: 'متوسطة', icon: AlertTriangle, description: 'يحتاج حل قريب', color: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100', activeColor: 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-200' },
  { value: 'high', label: 'عالية', icon: Zap, description: 'يؤثر على العمل', color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100', activeColor: 'bg-orange-100 border-orange-400 ring-2 ring-orange-200' },
  { value: 'urgent', label: 'عاجلة', icon: Flame, description: 'توقف كامل', color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100', activeColor: 'bg-red-100 border-red-400 ring-2 ring-red-200' },
];

const PortalNewTicket = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploadSettings, setUploadSettings] = useState({ maxSize: 1, allowedTypes: 'image/jpeg,image/png,image/gif,image/webp' });
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'technical',
    priority: 'medium',
    website_url: ''
  });

  useEffect(() => {
    fetchUploadSettings();
  }, []);

  const fetchUploadSettings = async () => {
    try {
      const { data: settings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['max_upload_size_mb', 'allowed_file_types']);

      if (settings) {
        settings.forEach(setting => {
          if (setting.key === 'max_upload_size_mb') {
            setUploadSettings(prev => ({ ...prev, maxSize: parseFloat(setting.value) || 1 }));
          }
          if (setting.key === 'allowed_file_types') {
            setUploadSettings(prev => ({ ...prev, allowedTypes: setting.value }));
          }
        });
      }
    } catch (error) {
      console.error('Error fetching upload settings:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeBytes = uploadSettings.maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`حجم الملف كبير جداً. الحد الأقصى: ${uploadSettings.maxSize} ميجابايت`);
      return;
    }

    const allowedTypes = uploadSettings.allowedTypes.split(',').map(t => t.trim());
    if (!allowedTypes.includes(file.type)) {
      toast.error('نوع الملف غير مسموح');
      return;
    }

    setScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.description) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);

    try {
      let screenshotUrl = null;

      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `tickets/${user?.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('docs-media')
          .upload(fileName, screenshot);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('docs-media')
          .getPublicUrl(fileName);
        
        screenshotUrl = publicUrl;
      }

      const ticketNum = 'TKT-' + Math.floor(100000 + Math.random() * 900000);

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          ticket_number: ticketNum,
          subject: formData.subject,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          website_url: formData.website_url || null,
          screenshot_url: screenshotUrl,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;

      setTicketNumber(ticketNum);
      setSubmitted(true);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('حدث خطأ أثناء إنشاء التذكرة');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl border border-green-200 dark:border-green-800 p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">تم إنشاء التذكرة بنجاح!</h2>
          <p className="text-muted-foreground mb-6">سيقوم فريق الدعم بالرد عليك في أقرب وقت</p>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border border-green-100 dark:border-green-900">
            <p className="text-sm text-muted-foreground mb-2">رقم التذكرة</p>
            <p className="text-3xl font-bold font-mono text-primary">{ticketNumber}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="gap-2">
              <Link to="/portal/tickets">
                <Ticket className="w-4 h-4" />
                عرض تذاكري
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/portal">العودة للوحة</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4 gap-2 text-muted-foreground hover:text-foreground">
          <Link to="/portal/tickets">
            <ArrowRight className="w-4 h-4" />
            العودة للتذاكر
          </Link>
        </Button>
        
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Ticket className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">تذكرة دعم جديدة</h1>
            <p className="text-muted-foreground">أخبرنا بمشكلتك وسنساعدك في أسرع وقت</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                currentStep >= step 
                  ? "bg-primary text-white" 
                  : "bg-muted text-muted-foreground"
              )}>
                {step}
              </div>
              {step < 3 && (
                <div className={cn(
                  "w-12 h-1 mx-1 rounded-full transition-all",
                  currentStep > step ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            {/* Step 1: Category & Priority */}
            <div className={cn(
              "p-6 space-y-6 border-b transition-all",
              currentStep === 1 ? "bg-background" : "bg-muted/30"
            )}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold text-lg">تصنيف المشكلة</h3>
              </div>

              {/* Category Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">نوع المشكلة</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, category: cat.value });
                        setCurrentStep(Math.max(currentStep, 1));
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                        formData.category === cat.value
                          ? cat.activeColor
                          : cat.color
                      )}
                    >
                      <cat.icon className="w-6 h-6" />
                      <span className="text-sm font-medium text-center">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">مستوى الأولوية</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {priorities.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, priority: p.value });
                        setCurrentStep(Math.max(currentStep, 2));
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                        formData.priority === p.value
                          ? p.activeColor
                          : p.color
                      )}
                    >
                      <p.icon className="w-6 h-6" />
                      <span className="text-sm font-medium">{p.label}</span>
                      <span className="text-xs opacity-75">{p.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2: Subject & Description */}
            <div className={cn(
              "p-6 space-y-6 border-b transition-all",
              currentStep >= 2 ? "bg-background" : "bg-muted/30 opacity-60"
            )}>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  currentStep >= 2 ? "bg-primary/10" : "bg-muted"
                )}>
                  <span className={cn(
                    "text-sm font-bold",
                    currentStep >= 2 ? "text-primary" : "text-muted-foreground"
                  )}>2</span>
                </div>
                <h3 className="font-semibold text-lg">تفاصيل المشكلة</h3>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-base font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  عنوان المشكلة <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="subject"
                  placeholder="اكتب عنواناً مختصراً يصف المشكلة"
                  value={formData.subject}
                  onChange={(e) => {
                    setFormData({ ...formData, subject: e.target.value });
                    if (e.target.value) setCurrentStep(Math.max(currentStep, 2));
                  }}
                  required
                  className="h-12 text-base border-2 focus:border-primary"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-medium">
                  وصف المشكلة بالتفصيل <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="اشرح المشكلة بالتفصيل...&#10;• ما الذي كنت تحاول فعله؟&#10;• ما الذي حدث؟&#10;• ما الرسالة أو الخطأ الذي ظهر؟"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (e.target.value) setCurrentStep(Math.max(currentStep, 3));
                  }}
                  rows={6}
                  required
                  className="text-base border-2 focus:border-primary resize-none"
                />
              </div>
            </div>

            {/* Step 3: Additional Info */}
            <div className={cn(
              "p-6 space-y-6 transition-all",
              currentStep >= 3 ? "bg-background" : "bg-muted/30 opacity-60"
            )}>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  currentStep >= 3 ? "bg-primary/10" : "bg-muted"
                )}>
                  <span className={cn(
                    "text-sm font-bold",
                    currentStep >= 3 ? "text-primary" : "text-muted-foreground"
                  )}>3</span>
                </div>
                <h3 className="font-semibold text-lg">معلومات إضافية (اختياري)</h3>
              </div>

              {/* Website URL */}
              <div className="space-y-2">
                <Label htmlFor="website_url" className="text-base font-medium flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  رابط الصفحة
                </Label>
                <Input
                  id="website_url"
                  type="url"
                  placeholder="https://example.com/page"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  className="h-12 text-base border-2 focus:border-primary"
                  dir="ltr"
                />
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center gap-2">
                  <FileImage className="w-4 h-4" />
                  صورة للمشكلة
                </Label>
                {!screenshotPreview ? (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-all duration-200 group">
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                        <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        انقر أو اسحب لرفع صورة
                      </p>
                      <p className="text-xs text-muted-foreground">
                        الحد الأقصى: {uploadSettings.maxSize} ميجابايت
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept={uploadSettings.allowedTypes}
                      onChange={handleFileChange}
                    />
                  </label>
                ) : (
                  <div className="relative inline-block group">
                    <img 
                      src={screenshotPreview} 
                      alt="Preview" 
                      className="max-h-48 rounded-xl border-2 border-muted"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={removeScreenshot}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Section */}
            <div className="bg-muted/50 border-t p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  سيتم إرسال التذكرة لفريق الدعم الفني
                </p>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate('/portal/tickets')}
                    className="flex-1 sm:flex-none"
                  >
                    إلغاء
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading || !formData.subject || !formData.description}
                    className="flex-1 sm:flex-none gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        إرسال التذكرة
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default PortalNewTicket;
