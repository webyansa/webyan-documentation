import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Ticket, 
  ArrowRight,
  Upload,
  X,
  Image,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const categories = [
  { value: 'technical', label: 'مشكلة تقنية' },
  { value: 'billing', label: 'الفواتير والمدفوعات' },
  { value: 'feature', label: 'طلب ميزة جديدة' },
  { value: 'training', label: 'التدريب والدعم' },
  { value: 'other', label: 'أخرى' },
];

const priorities = [
  { value: 'low', label: 'منخفضة', description: 'يمكن الانتظار' },
  { value: 'medium', label: 'متوسطة', description: 'يحتاج حل قريب' },
  { value: 'high', label: 'عالية', description: 'يؤثر على العمل' },
  { value: 'urgent', label: 'عاجلة', description: 'توقف كامل' },
];

const PortalNewTicket = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploadSettings, setUploadSettings] = useState({ maxSize: 1, allowedTypes: 'image/jpeg,image/png,image/gif,image/webp' });
  
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

    // Validate file size
    const maxSizeBytes = uploadSettings.maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`حجم الملف كبير جداً. الحد الأقصى: ${uploadSettings.maxSize} ميجابايت`);
      return;
    }

    // Validate file type
    const allowedTypes = uploadSettings.allowedTypes.split(',').map(t => t.trim());
    if (!allowedTypes.includes(file.type)) {
      toast.error('نوع الملف غير مسموح. يرجى رفع صورة فقط (JPEG, PNG, GIF, WebP)');
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

  const generateTicketNumber = () => {
    return 'TKT-' + Math.floor(100000 + Math.random() * 900000);
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

      // Upload screenshot if exists
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

      // Create ticket
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          ticket_number: generateTicketNumber(),
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

      toast.success('تم إنشاء التذكرة بنجاح');
      navigate(`/portal/tickets/${data.id}`);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('حدث خطأ أثناء إنشاء التذكرة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4 gap-2">
          <Link to="/portal/tickets">
            <ArrowRight className="w-4 h-4" />
            العودة للتذاكر
          </Link>
        </Button>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <Ticket className="w-8 h-8 text-primary" />
          تذكرة دعم جديدة
        </h1>
        <p className="text-muted-foreground mt-1">أخبرنا بمشكلتك وسنساعدك في أسرع وقت</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">عنوان المشكلة *</Label>
              <Input
                id="subject"
                placeholder="اكتب عنواناً مختصراً يصف المشكلة"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تصنيف المشكلة</Label>
                <Select 
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>الأولوية</Label>
                <Select 
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex flex-col">
                          <span>{p.label}</span>
                          <span className="text-xs text-muted-foreground">{p.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Website URL */}
            <div className="space-y-2">
              <Label htmlFor="website_url">رابط الموقع (اختياري)</Label>
              <Input
                id="website_url"
                type="url"
                placeholder="https://example.com"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">وصف المشكلة *</Label>
              <Textarea
                id="description"
                placeholder="اشرح المشكلة بالتفصيل... ما الذي كنت تحاول فعله؟ ما الذي حدث؟ ما الذي كنت تتوقعه؟"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                required
              />
            </div>

            {/* Screenshot Upload */}
            <div className="space-y-2">
              <Label>صورة للمشكلة (اختياري)</Label>
              {!screenshotPreview ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      انقر لرفع صورة (الحد الأقصى: {uploadSettings.maxSize} ميجابايت)
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
                <div className="relative inline-block">
                  <img 
                    src={screenshotPreview} 
                    alt="Preview" 
                    className="max-h-48 rounded-lg border border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 w-8 h-8"
                    onClick={removeScreenshot}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/portal/tickets')}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                إرسال التذكرة
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default PortalNewTicket;
